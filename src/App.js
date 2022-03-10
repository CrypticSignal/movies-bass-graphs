import "./App.css";
import { useEffect, useState } from "react";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import "bootstrap/dist/css/bootstrap.min.css";
import { PageSelector } from "./PageSelector";

function App() {
  const [showLoading, setShowLoading] = useState(true);
  const [allMovies, setAllMovies] = useState([]);
  const [moviesToShow, setMoviesToShow] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const moviesPerPage = 10;

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    const indexOfLastMovie = currentPage * moviesPerPage;
    const indexOfFirstMovie = indexOfLastMovie - moviesPerPage;
    setMoviesToShow(allMovies.slice(indexOfFirstMovie, indexOfLastMovie));
  }, [currentPage, allMovies]);

  useEffect(() => {
    async function getData() {
      const res = await fetch(
        "https://opensheet.elk.sh/1SdwJ_mfYgghxZG8gy41ke22e2AM9gUPTB1EmZgYcHoY/Sheet1"
      );
      const jsonData = await res.json();
      setMoviesToShow(jsonData.slice(0, 10));
      setShowLoading(false);
      setAllMovies(jsonData);
    }
    getData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filteredMovies = allMovies.filter((data) =>
        data.movieName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setMoviesToShow(filteredMovies);
    } else {
      setMoviesToShow(allMovies.slice(0, 10));
    }
  }, [searchTerm, allMovies]);

  return (
    <Container fluid>
      {moviesToShow.length || !showLoading ? (
        <div>
          <input
            id="searchBar"
            type="search"
            onInput={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
          ></input>

          {moviesToShow.map((data) => (
            <Card
              key={data.id}
              className="mb-2"
              onClick={() => window.open(data.imgurURL, "_self")}
            >
              <Card.Body>
                <Card.Title className="text-center">{data.movieName}</Card.Title>
              </Card.Body>
              <Card.Img variant="bottom" src={data.imgurURL} />
            </Card>
          ))}
          <PageSelector
            moviesPerPage={moviesPerPage}
            totalMovies={allMovies.length}
            paginate={paginate}
          />
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </Container>
  );
}

export default App;
