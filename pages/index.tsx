// pages/index.tsx

import React from 'react';

const IndexPage = () => {
  const handleClick = () => {
    alert('Hello, World!');
  };

  return (
    <div>
      <h1>Welcome to My Next.js Page</h1>
      <button onClick={handleClick}>Click Me</button>
    </div>
  );
};

export default IndexPage;
