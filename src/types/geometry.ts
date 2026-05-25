export interface Point {
  x: number;
  y: number;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Inner plotting area after margins are subtracted from the outer surface. */
export type PlotArea = BoundingBox;
