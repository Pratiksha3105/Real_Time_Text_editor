/**
 * CRDT Implementation - Last-Write-Wins Element Set with Vector Clocks
 * 
 * HOW IT WORKS:
 * Each character in the document has a unique ID (site:counter).
 * Operations are: Insert(char, afterId) and Delete(charId).
 * Because each char has a globally unique ID, concurrent inserts and
 * deletes can be merged without conflict — no "losing" edits.
 * 
 * We use a simplified Logoot/LSEQ approach:
 * - Each character has a position identifier (fractional index)
 * - Positions are unique per site, so concurrent inserts don't collide
 * - Tombstoning handles deletes (soft delete, then compact)
 */

class CRDTDocument {
  constructor(siteId) {
    this.siteId = siteId;
    this.counter = 0;
    // Each element: { id, char, position, deleted, author, timestamp }
    this.elements = [];
    this.clock = {}; // vector clock: { siteId: counter }
  }

  /**
   * Generate a unique position between two existing positions.
   * Uses a fractional indexing strategy to avoid conflicts.
   */
  _generatePosition(afterPos, beforePos) {
    const base = 16; // use hex-like fractional positions

    if (!afterPos && !beforePos) {
      return `${this.siteId}:${++this.counter}`;
    }

    if (!afterPos) {
      // Insert before the first element
      return `0.${this.siteId}${++this.counter}`;
    }

    if (!beforePos) {
      // Insert after the last element  
      return `${afterPos}z${this.siteId}${++this.counter}`;
    }

    // Generate a position lexicographically between afterPos and beforePos
    return `${afterPos}m${this.siteId}${++this.counter}`;
  }

  /**
   * Create an insert operation.
   * @param {string} char - Character to insert
   * @param {number} index - Visual index where to insert
   * @param {string} author - User who made the edit
   * @returns {Object} operation to broadcast
   */
  localInsert(char, index, author) {
    const visibleElements = this.elements.filter(e => !e.deleted);
    
    const afterElement = index > 0 ? visibleElements[index - 1] : null;
    const beforeElement = index < visibleElements.length ? visibleElements[index] : null;

    const position = this._generatePosition(
      afterElement?.position,
      beforeElement?.position
    );

    const element = {
      id: `${this.siteId}:${this.counter}`,
      char,
      position,
      deleted: false,
      author,
      timestamp: Date.now(),
    };

    this._integrate(element);

    // Update vector clock
    this.clock[this.siteId] = (this.clock[this.siteId] || 0) + 1;

    return {
      type: 'insert',
      element,
      clock: { ...this.clock },
    };
  }

  /**
   * Create a delete operation.
   * @param {number} index - Visual index to delete
   * @returns {Object} operation to broadcast
   */
  localDelete(index) {
    const visibleElements = this.elements.filter(e => !e.deleted);
    
    if (index < 0 || index >= visibleElements.length) return null;

    const element = visibleElements[index];
    element.deleted = true;
    element.deletedAt = Date.now();

    this.clock[this.siteId] = (this.clock[this.siteId] || 0) + 1;

    return {
      type: 'delete',
      elementId: element.id,
      clock: { ...this.clock },
    };
  }

  /**
   * Apply a remote insert operation.
   * CRDT guarantee: commutative and idempotent.
   */
  remoteInsert(element) {
    // Idempotency check
    if (this.elements.find(e => e.id === element.id)) return;
    this._integrate(element);
  }

  /**
   * Apply a remote delete operation.
   * Uses tombstoning — safe even if element hasn't arrived yet (handled by buffer).
   */
  remoteDelete(elementId) {
    const element = this.elements.find(e => e.id === elementId);
    if (element) {
      element.deleted = true;
      element.deletedAt = Date.now();
    } else {
      // Buffer the delete in case element arrives later
      this._pendingDeletes = this._pendingDeletes || new Set();
      this._pendingDeletes.add(elementId);
    }
  }

  /**
   * Integrate a new element into the sorted elements array.
   * Sort by position string (lexicographic = consistent order across sites).
   */
  _integrate(element) {
    let insertIdx = this.elements.length;
    
    for (let i = 0; i < this.elements.length; i++) {
      if (element.position < this.elements[i].position) {
        insertIdx = i;
        break;
      } else if (element.position === this.elements[i].position) {
        // Tie-break by siteId for determinism
        if (element.id < this.elements[i].id) {
          insertIdx = i;
          break;
        }
      }
    }

    this.elements.splice(insertIdx, 0, element);

    // Check pending deletes
    if (this._pendingDeletes?.has(element.id)) {
      element.deleted = true;
      this._pendingDeletes.delete(element.id);
    }
  }

  /**
   * Get the current visible text content.
   */
  getText() {
    return this.elements
      .filter(e => !e.deleted)
      .map(e => e.char)
      .join('');
  }

  /**
   * Get full state for persistence/sync.
   */
  getState() {
    return {
      siteId: this.siteId,
      counter: this.counter,
      elements: this.elements,
      clock: this.clock,
    };
  }

  /**
   * Load state from persistence.
   */
  static fromState(state) {
    const doc = new CRDTDocument(state.siteId);
    doc.counter = state.counter || 0;
    doc.elements = state.elements || [];
    doc.clock = state.clock || {};
    return doc;
  }

  /**
   * Merge two CRDT states (for reconnection sync).
   * Merges all elements by ID, applying deletes idempotently.
   */
  merge(remoteState) {
    for (const remoteEl of remoteState.elements) {
      const local = this.elements.find(e => e.id === remoteEl.id);
      if (!local) {
        this._integrate({ ...remoteEl });
      } else if (remoteEl.deleted && !local.deleted) {
        local.deleted = true;
        local.deletedAt = remoteEl.deletedAt;
      }
    }

    // Merge vector clocks (take max)
    for (const [site, count] of Object.entries(remoteState.clock || {})) {
      this.clock[site] = Math.max(this.clock[site] || 0, count);
    }
  }
}

module.exports = { CRDTDocument };
