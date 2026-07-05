import * as d3 from 'd3';
import * as d3Color from 'd3-color';

/**
 * Converts a CSS hex color string to a p5-compatible [r, g, b] tuple.
 * @param hex Hex color string with or without leading '#' (e.g. '#ff8800' or 'ff8800')
 * @returns RGB tuple with values 0–255; falls back to [255, 255, 255] for invalid input
 */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex);
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : [255, 255, 255];
}

export class ColorManager {
  constructor(public colorPalette: d3Color.Color[] = []) {}

  static colorsFromRgb(rgb: number[]): d3Color.Color {
    if (rgb.length !== 3) {
      console.warn('RGB array must have exactly 3 elements');
      return d3.color('black') as d3Color.Color;
    }
    const color = d3Color.rgb(rgb[0], rgb[1], rgb[2]);
    return color;
  }

  addColor(
    color: d3Color.Color | string | d3Color.Color[] | string[],
  ): ColorManager {
    if (Array.isArray(color)) {
      // Validate each color in the array
      const validColors = color
        .map((c) => (typeof c === 'string' ? d3Color.color(c) : c)) // Narrow type
        .filter((c) => c !== null); // Filter out invalid colors
      this.colorPalette.push(...validColors);
    } else {
      // Validate a single color
      const validColor =
        typeof color === 'string' ? d3Color.color(color) : color; // Narrow type
      if (validColor) {
        this.colorPalette.push(validColor);
      } else {
        console.warn(`Invalid color: ${color}`);
      }
    }
    return this;
  }

  interpolatePalette(parameter: number): d3Color.Color {
    if (this.colorPalette.length === 0) {
      console.warn('Color palette is empty, returning default color');
      return d3.color('red') as d3Color.Color;
    }
    return d3.color(
      d3.interpolateRgbBasis(this.colorPalette.map((c) => c.toString()))(
        parameter,
      ),
    ) as d3Color.Color;
  }
}
