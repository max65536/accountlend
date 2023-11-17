import React from 'react';

function MyPage() {
  // 定义要触发的函数
  const handleClick = () => {
    console.log('按钮被点击了');
    // 在这里添加更多的函数逻辑
  };

  return (
    <div>
      <h1>我的页面</h1>
      <button onClick={handleClick}>点击我</button>
    </div>
  );
}

export default MyPage;
