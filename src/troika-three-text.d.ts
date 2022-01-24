declare module 'troika-three-text' {
  export class Text {
    text: string;
    fontSize: number;
    color: string;
    anchorX: string;
    anchorY: string;

    // Update the rendering:
    sync(): void;
  }
}
