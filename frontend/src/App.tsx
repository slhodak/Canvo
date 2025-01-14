import { useState } from 'react';
import './App.css'
import { LayerObject, Layer } from './Layer';

function generateRandomLayers(numLayers: number) {
  const layers: LayerObject[] = [];
  for (let i = 0; i < numLayers; i++) {
    layers.push({ id: i });
  }
  return layers;
}

const testLayers = generateRandomLayers(10);

function App() {
  const [layers, setLayers] = useState<LayerObject[]>(testLayers);

  return (
    <div>
      {layers.map((layer) => (
        <Layer layer={layer} />
      ))}
    </div>
  );
}

export default App;
