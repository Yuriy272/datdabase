import { useEffect, useState } from 'react';

export default function CodeGate({ children }) {
  const [ok, setOk] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    const flag = localStorage.getItem('app_ok');
    if (flag === '1') setOk(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim() === import.meta.env.VITE_ENTRY_CODE) {
      localStorage.setItem('app_ok', '1');
      setOk(true);
    } else {
      alert('Невірний код');
    }
  };

  if (!ok) {
    return (
      <div style={{display:'grid',placeItems:'center',minHeight:'100vh'}}>
        <form onSubmit={handleSubmit} style={{display:'grid',gap:12}}>
          <h3>Введіть код доступу</h3>
          <input
            value={code}
            onChange={(e)=>setCode(e.target.value)}
            placeholder="Код"
            autoFocus
          />
          <button type="submit">Увійти</button>
        </form>
      </div>
    );
  }
  return children;
}
