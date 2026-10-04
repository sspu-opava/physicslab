import type { PhysicsDocument } from '../document/types';

export interface EditorCommand {
  readonly label: string;
  execute(): PhysicsDocument;
  undo(): PhysicsDocument;
}

/** Document snapshots contain only authoring data, never simulation states. */
export class DocumentCommand implements EditorCommand {
  private before: PhysicsDocument;
  private after: PhysicsDocument;
  constructor(readonly label: string, before: PhysicsDocument, after: PhysicsDocument) {
    this.before = structuredClone(before);
    this.after = structuredClone(after);
  }
  execute(): PhysicsDocument { return structuredClone(this.after); }
  undo(): PhysicsDocument { return structuredClone(this.before); }
}

export class CommandHistory {
  private past: EditorCommand[] = [];
  private future: EditorCommand[] = [];
  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }
  get undoLabel(): string { return this.past.at(-1)?.label ?? ''; }
  execute(command: EditorCommand): PhysicsDocument {
    const result = command.execute(); this.past.push(command);
    if (this.past.length > 100) this.past.shift();
    this.future = []; return result;
  }
  undo(): PhysicsDocument | undefined {
    const command = this.past.pop(); if (!command) return;
    this.future.push(command); return command.undo();
  }
  redo(): PhysicsDocument | undefined {
    const command = this.future.pop(); if (!command) return;
    this.past.push(command); return command.execute();
  }
}
