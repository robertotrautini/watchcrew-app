import { render } from "@testing-library/react-native";

import { MovieDetailCastRow } from "@/components/movie/MovieDetailCastRow";
import { MovieDetailDescription } from "@/components/movie/MovieDetailDescription";
import { MovieDetailGenreTags } from "@/components/movie/MovieDetailGenreTags";
import { MovieDetailMetaRow } from "@/components/movie/MovieDetailMetaRow";
import { MovieDetailProviders } from "@/components/movie/MovieDetailProviders";
import { MovieDetailTitleRow } from "@/components/movie/MovieDetailTitleRow";

import { CHIP_HEIGHT_CLASSNAME } from "@/components/ui/Chip";
import { MOVIE_DETAIL_DESCRIPTION_TEXT_CLASSNAME } from "@/components/movie/MovieDetailDescription";
import { MOVIE_DETAIL_META_TEXT_CLASSNAME } from "@/components/movie/MovieDetailMetaRow";
import { MOVIE_DETAIL_TITLE_TEXT_CLASSNAME } from "@/components/movie/MovieDetailTitleRow";
import {
  CAST_AVATAR_SIZE_CLASSNAME,
  CAST_CHARACTER_CLASSNAME,
  CAST_DIRECTOR_NAME_CLASSNAME,
  CAST_NAME_CLASSNAME,
} from "@/components/movie/MovieDetailCastRow";
import {
  PROVIDER_HEADER_CLASSNAME,
  PROVIDER_LOGO_CLASSNAME,
  PROVIDER_NAME_CLASSNAME,
} from "@/components/movie/MovieDetailProviders";

const noop = () => {};

describe("Movie detail skeleton placeholders", () => {
  it("genre tags: 3 chip skeletons while loading without genres, real tags once present", async () => {
    const loading = await render(<MovieDetailGenreTags genres={[]} isLoading />);
    expect(loading.getByTestId("movie-detail-genre-skeleton-2")).toBeTruthy();
    await loading.unmount();

    const loaded = await render(<MovieDetailGenreTags genres={["Drama"]} isLoading />);
    expect(loaded.queryByTestId("movie-detail-genre-skeleton-0")).toBeNull();
    expect(loaded.getByTestId("movie-detail-genre-tag-0")).toBeTruthy();
  });

  it("meta row: skeletons only for the missing runtime/date", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailMetaRow runtimeLabel="2 h" releaseInfo={null} isLoading />,
    );
    expect(queryByTestId("movie-detail-runtime-skeleton")).toBeNull();
    expect(getByTestId("movie-detail-runtime")).toBeTruthy();
    expect(getByTestId("movie-detail-release-date-skeleton")).toBeTruthy();
  });

  it("meta row: no skeleton when not loading", async () => {
    const { queryByTestId } = await render(
      <MovieDetailMetaRow runtimeLabel={null} releaseInfo={null} />,
    );
    expect(queryByTestId("movie-detail-runtime-skeleton")).toBeNull();
    expect(queryByTestId("movie-detail-release-date-skeleton")).toBeNull();
  });

  it("title row: skeleton replaces the title while loading", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailTitleRow
        title="Film"
        voteAverage={null}
        showHeart={false}
        liked={false}
        onToggleLike={noop}
        isLoading
      />,
    );
    expect(getByTestId("movie-detail-title-skeleton")).toBeTruthy();
    expect(queryByTestId("movie-detail-title")).toBeNull();
  });

  it("description: skeleton lines while loading without overview, nothing afterwards", async () => {
    const loading = await render(<MovieDetailDescription overview={null} isLoading />);
    expect(loading.getByTestId("movie-detail-description-skeleton")).toBeTruthy();
    await loading.unmount();

    const done = await render(<MovieDetailDescription overview={null} />);
    expect(done.queryByTestId("movie-detail-description-skeleton")).toBeNull();
  });

  it("providers: skeleton while loading, nothing when loaded empty", async () => {
    const loading = await render(<MovieDetailProviders providers={null} isLoading />);
    expect(loading.getByTestId("movie-detail-providers-skeleton")).toBeTruthy();
    await loading.unmount();

    const done = await render(<MovieDetailProviders providers={null} />);
    expect(done.queryByTestId("movie-detail-providers-skeleton")).toBeNull();
  });

  it("cast row: director + cast skeletons while loading, none once data is there", async () => {
    const loading = await render(
      <MovieDetailCastRow
        director={null}
        cast={[]}
        onDirectorPress={noop}
        onCastMemberPress={noop}
        isLoading
      />,
    );
    expect(loading.getByTestId("movie-detail-director-skeleton")).toBeTruthy();
    expect(loading.getByTestId("movie-detail-cast-skeleton")).toBeTruthy();
    await loading.unmount();

    const loaded = await render(
      <MovieDetailCastRow
        director={{ id: 1, name: "Regie Person", job: "Director" } as never}
        cast={[]}
        onDirectorPress={noop}
        onCastMemberPress={noop}
      />,
    );
    expect(loaded.queryByTestId("movie-detail-director-skeleton")).toBeNull();
  });

  describe("skeleton and content share the same height classes (no layout jump)", () => {
    const hidden = (json: unknown, cls: string) =>
      JSON.stringify(json).includes(`opacity-0 ${cls}`);

    it("title / meta / description reserve the real text style", async () => {
      const title = await render(
        <MovieDetailTitleRow title="x" voteAverage={null} showHeart={false} liked={false} onToggleLike={noop} isLoading />,
      );
      expect(hidden(title.toJSON(), MOVIE_DETAIL_TITLE_TEXT_CLASSNAME)).toBe(true);
      await title.unmount();

      const real = await render(
        <MovieDetailTitleRow title="x" voteAverage={null} showHeart={false} liked={false} onToggleLike={noop} />,
      );
      expect(real.getByTestId("movie-detail-title").props.className).toContain(
        MOVIE_DETAIL_TITLE_TEXT_CLASSNAME,
      );
      await real.unmount();

      const meta = await render(<MovieDetailMetaRow runtimeLabel={null} releaseInfo={null} isLoading />);
      expect(hidden(meta.toJSON(), MOVIE_DETAIL_META_TEXT_CLASSNAME)).toBe(true);
      await meta.unmount();
      const metaReal = await render(<MovieDetailMetaRow runtimeLabel="2 h" releaseInfo={null} />);
      expect(metaReal.getByTestId("movie-detail-runtime").props.className).toContain(
        MOVIE_DETAIL_META_TEXT_CLASSNAME,
      );
      await metaReal.unmount();

      const desc = await render(<MovieDetailDescription overview={null} isLoading />);
      expect(hidden(desc.toJSON(), MOVIE_DETAIL_DESCRIPTION_TEXT_CLASSNAME)).toBe(true);
      await desc.unmount();
      const descReal = await render(<MovieDetailDescription overview="Text" />);
      expect(descReal.getByTestId("movie-detail-description-text").props.className).toContain(
        MOVIE_DETAIL_DESCRIPTION_TEXT_CLASSNAME,
      );
    });

    it("chips, cast and providers use the real size tokens", async () => {
      const genres = await render(<MovieDetailGenreTags genres={[]} isLoading />);
      expect(genres.getByTestId("movie-detail-genre-skeleton-0").props.className).toContain(CHIP_HEIGHT_CLASSNAME);
      await genres.unmount();
      const real = await render(<MovieDetailGenreTags genres={["A"]} />);
      expect(JSON.stringify(real.toJSON())).toContain(CHIP_HEIGHT_CLASSNAME);
      await real.unmount();

      const cast = await render(
        <MovieDetailCastRow director={null} cast={[]} onDirectorPress={noop} onCastMemberPress={noop} isLoading />,
      );
      const json = cast.toJSON();
      expect(hidden(json, CAST_DIRECTOR_NAME_CLASSNAME)).toBe(true);
      expect(hidden(json, CAST_NAME_CLASSNAME)).toBe(true);
      expect(hidden(json, CAST_CHARACTER_CLASSNAME)).toBe(true);
      expect(JSON.stringify(json)).toContain(CAST_AVATAR_SIZE_CLASSNAME);
      await cast.unmount();

      const prov = await render(<MovieDetailProviders providers={null} isLoading />);
      const pj = prov.toJSON();
      expect(hidden(pj, PROVIDER_HEADER_CLASSNAME)).toBe(true);
      expect(hidden(pj, PROVIDER_NAME_CLASSNAME)).toBe(true);
      expect(JSON.stringify(pj)).toContain(PROVIDER_LOGO_CLASSNAME);
    });
  });
});
