import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

afterEach(() => { jest.restoreAllMocks(); delete global.fetch; });

test("loads bundled graphs and resets pagination when searching", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => Array.from({ length: 11 }, (_, i) => ({
      id: String(i), movieName: "Movie " + i, imagePath: "graphs/" + i + ".jpg",
      imgurURL: "https://i.imgur.com/original.png"
    }))
  });
  render(<App />);
  await screen.findByText("Movie 0");
  expect(global.fetch.mock.calls[0][0]).toBe((process.env.PUBLIC_URL || "") + "/graphs/catalogue.json");
  expect(screen.getByRole("link", { name: "Open graph for Movie 0" })).toHaveAttribute(
    "href", (process.env.PUBLIC_URL || "") + "/graphs/0.jpg"
  );
  fireEvent.click(screen.getByText("Next"));
  expect(screen.getByText("Movie 10")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Movie 0" } });
  expect(screen.getByText("Movie 0")).toBeInTheDocument();
  expect(screen.queryByText("Movie 10")).not.toBeInTheDocument();
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText(/Graph currently unavailable/)).toBeInTheDocument();
});

test("shows a retry button when the catalogue request fails", async () => {
  global.fetch = jest.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({
    ok: true, json: async () => [{ id: "1", movieName: "Recovered movie", imagePath: null }]
  });
  render(<App />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByText("Try again"));
  await screen.findByText("Recovered movie");
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(screen.getByText(/Graph currently unavailable/)).toBeInTheDocument();
});
