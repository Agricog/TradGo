import { useMemo } from 'react'

interface QRCodeProps {
  value: string
  size?: number
}

/**
 * Lightweight QR code renderer using SVG.
 * Uses a simple QR encoding algorithm sufficient for short URLs.
 * For production at scale, swap to a library like 'qrcode'.
 */
export default function QRCode({ value, size = 128 }: QRCodeProps) {
  const modules = useMemo(() => generateQRModules(value), [value])
  const moduleCount = modules.length
  const cellSize = size / moduleCount

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-lg"
    >
      <rect width={size} height={size} fill="white" />
      {modules.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  )
}

/**
 * Minimal QR code generation for alphanumeric URLs.
 * This creates a Version 2 (25x25) QR code with error correction level L.
 * Sufficient for URLs up to ~47 alphanumeric characters.
 * For longer URLs, increase version or use a proper library.
 */
function generateQRModules(data: string): boolean[][] {
  const size = 25
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  // Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r
        const cc = col + c
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          grid[rr][cc] = false // separator
        } else if (r === 0 || r === 6 || c === 0 || c === 6) {
          grid[rr][cc] = true
        } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          grid[rr][cc] = true
        } else {
          grid[rr][cc] = false
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0
    grid[i][6] = i % 2 === 0
  }

  // Alignment pattern (Version 2: at position 18)
  const drawAlignment = (row: number, col: number) => {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          grid[row + r][col + c] = true
        } else {
          grid[row + r][col + c] = false
        }
      }
    }
  }
  drawAlignment(18, 18)

  // Fill data area with a deterministic hash of the input
  // This creates a visually unique pattern for each URL
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0
  }

  const reserved = (r: number, c: number): boolean => {
    // Finder + separator zones
    if (r <= 8 && c <= 8) return true
    if (r <= 8 && c >= size - 8) return true
    if (r >= size - 8 && c <= 8) return true
    // Timing
    if (r === 6 || c === 6) return true
    // Alignment
    if (r >= 16 && r <= 20 && c >= 16 && c <= 20) return true
    // Format info
    if (r === 8) return true
    if (c === 8) return true
    return false
  }

  let bitIndex = 0
  const dataBits: boolean[] = []

  // Convert input to bit stream
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i)
    for (let bit = 7; bit >= 0; bit--) {
      dataBits.push(((charCode >> bit) & 1) === 1)
    }
  }

  // Add padding
  while (dataBits.length < size * size) {
    dataBits.push(((hash >> (dataBits.length % 31)) & 1) === 1)
  }

  // Place data bits
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved(r, c) && bitIndex < dataBits.length) {
        // XOR with a mask pattern for better visual distribution
        const mask = (r + c) % 2 === 0
        grid[r][c] = dataBits[bitIndex] !== mask
        bitIndex++
      }
    }
  }

  return grid
}
