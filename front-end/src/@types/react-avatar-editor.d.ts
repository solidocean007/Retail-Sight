declare module "react-avatar-editor" {
  import * as React from "react";

  interface AvatarEditorProps {
    image: string | File;
    width: number;
    height: number;
    border?: number;
    color?: [number, number, number, number]; // RGBA
    scale?: number;
    rotate?: number;
    borderRadius?: number;
    className?: string;
    style?: React.CSSProperties;
  }

  export default class AvatarEditor extends React.Component<AvatarEditorProps> {
    getImage(): HTMLImageElement;
    getImageScaledToCanvas(): HTMLCanvasElement;
    getCroppingRect(): { x: number; y: number; width: number; height: number };
  }
}
