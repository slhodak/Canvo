import { useState } from 'react';
import './App.css'
import { BlockObject, Block } from './Block';

function generateRandomBlocks(numBlocks: number) {
  const blocks = [];
  for (let i = 0; i < numBlocks; i++) {
    blocks.push({
      id: i,
      text: "Hello, world!",
    });
  }
  return blocks;
}

const testBlocks = generateRandomBlocks(10);

function App() {
  const [blocks, setBlocks] = useState<BlockObject[]>(testBlocks);

  return (
    <div>
      {blocks.map((block) => (
        <Block block={block} />
      ))}
    </div>
  );
}

export default App;
