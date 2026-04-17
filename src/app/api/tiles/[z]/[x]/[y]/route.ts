import { NextRequest, NextResponse } from 'next/server';
import { getTilesDb } from '@/lib/db/tilesDb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const { z, x, y } = await params;
    
    // Parse parameters
    const zNum = parseInt(z);
    const xNum = parseInt(x);
    // Remove file extension if present (e.g. .pbf or .png)
    const yNum = parseInt(y.split('.')[0]);

    if (isNaN(zNum) || isNaN(xNum) || isNaN(yNum)) {
      return new NextResponse('Invalid coordinates', { status: 400 });
    }

    // MBTiles uses TMS (flipped Y)
    // Formula: y_tms = (2^z) - 1 - y_xyz
    const yTms = (1 << zNum) - 1 - yNum;

    const db = getTilesDb();
    
    // Query tile data
    const row = db.prepare('SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?')
                  .get(zNum, xNum, yTms) as { tile_data: Buffer } | undefined;

    if (!row || !row.tile_data) {
      return new NextResponse('Tile not found', { status: 404 });
    }

    // Return the tile
    // GZIP detected in analysis -> Content-Encoding: gzip is REQUIRED
    return new NextResponse(row.tile_data, {
      headers: {
        'Content-Type': 'application/vnd.mapbox-vector-tile',
        'Content-Encoding': 'gzip',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      },
    });

  } catch (error) {
    console.error('Tile error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
