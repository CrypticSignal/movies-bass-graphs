import "./App.css";
import { useEffect, useState } from "react";
import Card from "react-bootstrap/Card";
import "bootstrap/dist/css/bootstrap.min.css";

const base = process.env.PUBLIC_URL || "";
const moviesPerPage = 10;

function Graph({ movie }) {
  const [failed, setFailed] = useState(false);
  const imageURL = movie.imagePath ? base + "/" + movie.imagePath : null;
  return (
    <Card id="card" className="mb-2">
      <Card.Body>
        <Card.Title className="text-center">{movie.movieName}</Card.Title>
      </Card.Body>
      {imageURL && !failed ? (
        <a href={imageURL} aria-label={"Open graph for " + movie.movieName}>
          <img src={imageURL} alt={"Bass frequency graph for " + movie.movieName}
            loading="lazy" style={{ width: "100%" }} onError={() => setFailed(true)} />
        </a>
      ) : (
        <Card.Body>Graph currently unavailable. The original image could not be recovered.</Card.Body>
      )}
    </Card>
  );
}

function App() {
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState("loading");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch(base + "/graphs/catalogue.json", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Catalogue unavailable");
        return response.json();
      })
      .then(rows => {
        if (!Array.isArray(rows)) throw new Error("Invalid catalogue");
        setMovies(rows);
        setStatus("ready");
      })
      .catch(error => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [attempt]);

  const filtered = movies.filter(movie =>
    movie.movieName.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / moviesPerPage));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * moviesPerPage, currentPage * moviesPerPage);

  return (
    <main id="container">
      <div>
        <h1 className="text-center">Movies Bass Graphs</h1>
        {status === "loading" && <p role="status">Loading graphs…</p>}
        {status === "error" && (
          <div role="alert">
            <p>The movie catalogue could not be loaded.</p>
            <button onClick={() => setAttempt(value => value + 1)}>Try again</button>
          </div>
        )}
        {status === "ready" && (
          <>
            <input id="searchBar" type="search" aria-label="Search movie titles"
              placeholder="Search movies" value={searchTerm}
              onChange={event => { setSearchTerm(event.target.value); setPage(1); }} />
            <p className="text-center">{filtered.length} movies</p>
            {visible.map(movie => <Graph key={movie.id || movie.movieName} movie={movie} />)}
            {!filtered.length && <p>No movies match your search.</p>}
            {filtered.length > moviesPerPage && (
              <nav aria-label="Movie pages" className="mb-3">
                <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
                <span aria-live="polite"> Page {currentPage} of {totalPages} </span>
                <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default App;
