import { useParams } from 'react-router-dom';

export default function Board() {
  const { id } = useParams();
  return (
    <main style={{ padding: 16 }}>
      <h2>Board #{id}</h2>
      <p>Columns and tasks will be rendered here.</p>
    </main>
  );
}
