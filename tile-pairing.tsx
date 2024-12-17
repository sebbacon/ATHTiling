import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus } from 'lucide-react';
import { RotateCw } from 'lucide-react';
import { RotateCcw } from 'lucide-react';
import { FlipHorizontal } from 'lucide-react';

const TilePairingInterface = () => {
  const [tiles, setTiles] = useState([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [draggedTile, setDraggedTile] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const tilePath = "M93.075588,186.263531L94.568682,74.654722l63.456514-.373275L190.5,19.036953L286.058044,73.5349l-.373274,110.488989l63.829788.746547L381,240.761477l-95.688503,54.497947L190.5,240.761476l-31.728257,54.124673-129.152669-.000001L0,240.761476l93.075588-54.497945Z";

  const centerX = 190.5;
  const centerY = 147.5;

  const addTilePair = () => {
    setTiles([...tiles, {
      id: Date.now(),
      front: null,
      back: null,
      x: Math.random() * 800,
      y: Math.random() * 600,
      rotation: 0,
      isMirrored: false
    }]);
  };

  const rotateTile = (tileId, direction) => {
    setTiles(tiles.map(tile => 
      tile.id === tileId
        ? { ...tile, rotation: tile.rotation + (direction * 15) } // Changed to 15 degrees for finer control
        : tile
    ));
  };

  const mirrorTile = (tileId) => {
    setTiles(tiles.map(tile => 
      tile.id === tileId
        ? { ...tile, isMirrored: !tile.isMirrored }
        : tile
    ));
  };

  const handleDragStart = (e, tile) => {
    const svgElement = e.target.closest('svg');
    const pt = svgElement.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgElement.getScreenCTM().inverse());
    
    setDraggedTile(tile);
    setDragOffset({
      x: svgP.x - tile.x,
      y: svgP.y - tile.y
    });
  };

  const handleDrag = (e) => {
    if (!draggedTile) return;

    const svgElement = e.target.closest('svg');
    const pt = svgElement.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgElement.getScreenCTM().inverse());

    setTiles(tiles.map(tile => 
      tile.id === draggedTile.id
        ? { ...tile, x: svgP.x - dragOffset.x, y: svgP.y - dragOffset.y }
        : tile
    ));
  };

  const handleDragEnd = () => {
    setDraggedTile(null);
  };

  const handleImageSelect = (e, tileId, side) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTiles(tiles.map(tile =>
          tile.id === tileId
            ? { ...tile, [side]: e.target.result }
            : tile
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBulkImport = async (e) => {
    const files = Array.from(e.target.files);
    const pairs = new Map();
    
    // Group files by their stem
    files.forEach(file => {
      const match = file.name.match(/(.+)_(obverse|reverse)\.png$/i);
      if (match) {
        const [, stem, side] = match;
        if (!pairs.has(stem)) {
          pairs.set(stem, {});
        }
        pairs.get(stem)[side.toLowerCase()] = file;
      }
    });

    // Create tiles for each pair
    const newTiles = [];
    for (const [, pair] of pairs) {
      if (pair.obverse || pair.reverse) {
        const tile = {
          id: Date.now() + Math.random(),
          front: null,
          back: null,
          x: Math.random() * 800,
          y: Math.random() * 600,
          rotation: 0,
          isMirrored: false
        };

        // Load images
        if (pair.obverse) {
          tile.front = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(pair.obverse);
          });
        }
        if (pair.reverse) {
          tile.back = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(pair.reverse);
          });
        }

        newTiles.push(tile);
      }
    }

    setTiles([...tiles, ...newTiles]);
  };

  const getTileTransform = (tile) => {
    return `
      translate(${tile.x + centerX}, ${tile.y + centerY})
      rotate(${tile.rotation})
      scale(${(tile.isMirrored ? -1 : 1) * (isFlipped ? -1 : 1)}, 1)
      translate(${-centerX}, ${-centerY})
    `;
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex justify-between p-4">
        <div className="flex gap-2">
          <Button 
            onClick={addTilePair}
            className="flex items-center gap-2"
            variant="outline"
          >
            <ImagePlus className="w-4 h-4" />
            Add Tile
          </Button>
          <div className="relative">
            <Button 
              onClick={() => document.getElementById('bulk-import').click()}
              className="flex items-center gap-2"
              variant="outline"
            >
              <FolderPlus className="w-4 h-4" />
              Bulk Import
            </Button>
            <input
              id="bulk-import"
              type="file"
              multiple
              accept=".png"
              onChange={handleBulkImport}
              className="hidden"
            />
          </div>
        </div>
        <Button 
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-2"
          variant="outline"
        >
          <RotateCcw className="w-4 h-4" />
          Flip All
        </Button>
      </div>

      <svg 
        className="flex-1 w-full bg-gray-50"
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {tiles.map((tile) => (
            <React.Fragment key={`patterns-${tile.id}`}>
              <pattern
                id={`front-${tile.id}`}
                patternUnits="userSpaceOnUse"
                width="381"
                height="295"
                patternTransform={`scale(${(tile.isMirrored ? -1 : 1) * (isFlipped ? -1 : 1)}, 1)`}
              >
                {tile.front ? (
                  <image
                    href={tile.front}
                    width="381"
                    height="295"
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <rect width="381" height="295" fill="#f0f0f0" />
                )}
              </pattern>
              <pattern
                id={`back-${tile.id}`}
                patternUnits="userSpaceOnUse"
                width="381"
                height="295"
                patternTransform={`scale(${(tile.isMirrored ? -1 : 1) * (isFlipped ? -1 : 1)}, 1)`}
              >
                {tile.back ? (
                  <image
                    href={tile.back}
                    width="381"
                    height="295"
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <rect width="381" height="295" fill="#e0e0e0" />
                )}
              </pattern>
            </React.Fragment>
          ))}
        </defs>

        {tiles.map((tile) => (
          <g
            key={tile.id}
            transform={getTileTransform(tile)}
            onMouseDown={(e) => handleDragStart(e, tile)}
            style={{ cursor: 'move' }}
          >
            <path
              d={tilePath}
              fill={`url(#${isFlipped ? 'back' : 'front'}-${tile.id})`}
              stroke="black"
              strokeWidth="1"
            />
            {!tile[isFlipped ? 'back' : 'front'] && (
              <foreignObject x="140" y="120" width="100" height="40">
                <div className="flex justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, tile.id, isFlipped ? 'back' : 'front')}
                    className="w-full h-full opacity-0 cursor-pointer absolute"
                  />
                  <span className="text-gray-500 text-sm">
                    {isFlipped ? 'Add Back' : 'Add Front'}
                  </span>
                </div>
              </foreignObject>
            )}
            <foreignObject x="100" y="240" width="180" height="40">
              <div className="flex justify-center gap-2">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    rotateTile(tile.id, -1);
                  }}
                  size="sm"
                  variant="outline"
                  className="bg-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    rotateTile(tile.id, 1);
                  }}
                  size="sm"
                  variant="outline"
                  className="bg-white"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    mirrorTile(tile.id);
                  }}
                  size="sm"
                  variant="outline"
                  className="bg-white"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default TilePairingInterface;
