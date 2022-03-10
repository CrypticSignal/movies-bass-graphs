import { useState } from "react";
import { Pagination } from "semantic-ui-react";

export const PageSelector = ({ moviesPerPage, totalMovies, paginate }) => {
  const [page, setPage] = useState(1);

  const handlePageChange = (e, pageInfo) => {
    paginate(pageInfo.activePage);
    setPage(pageInfo.activePage);
  };

  const numberOfPages = Math.ceil(totalMovies / moviesPerPage);

  return (
    <div>
      {numberOfPages ? (
        <div id="pageSelector">
          <Pagination
            activePage={page}
            boundaryRange={0}
            ellipsisItem={null}
            firstItem={null}
            lastItem={null}
            siblingRange={1}
            totalPages={numberOfPages}
            onPageChange={handlePageChange}
          />
        </div>
      ) : null}
    </div>
  );
};
