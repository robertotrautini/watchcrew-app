// Synthetic MySQL (phpMyAdmin-style) dump for the legacy-import tests.
// No real data. Covers: escapes, duplicates by tmdb_id, same-group collapse,
// excluded groups/members, empty ratings, CJK name, placeholder date.

const MOVIE_COLS =
  "(`id`, `tmdb_id`, `name`, `release_date`, `poster`, `overview`, `vote_average`, `created_at`, `runtime`, `director`, `director_id`)";

const FIXTURE_DUMP = `-- synthetic
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

INSERT INTO \`genres\` (\`id\`, \`name\`) VALUES
(1, 'Drama'),
(2, 'Action'),
(3, 'Unbekannt');

INSERT INTO \`groups\` (\`id\`, \`name\`) VALUES
('g1', 'Alle Drei'),
('g2', 'Robin & Tobias'),
('g3', 'Bebbo & Bini');

INSERT INTO \`members\` (\`id\`, \`name\`) VALUES
(1, 'Robin'),
(2, 'Tobias'),
(3, 'Dad'),
(4, 'Bebbo');

INSERT INTO \`group_members\` (\`group_id\`, \`member_id\`, \`sort_order\`) VALUES
('g1', 1, 0),
('g1', 2, 1),
('g1', 3, 2),
('g2', 1, 0),
('g2', 2, 1),
('g3', 4, 0);

INSERT INTO \`movies\` ${MOVIE_COLS} VALUES
('mA', 100, 'Film A', '2020-05-01', 'https://image.tmdb.org/t/p/w154/a.jpg', 'It\\'s a "quoted" one\\nline2', '7.5', '2026-03-01 10:00:00', 100, 'Dir A', 11),
('mB1', 200, 'Film B', NULL, 'https://image.tmdb.org/t/p/w342/b1.jpg', '', NULL, '2026-03-02 10:00:00', NULL, NULL, NULL),
('mB2', 200, 'Film B', '2021-01-01', 'https://image.tmdb.org/t/p/w154/b2.jpg', 'Beschreibung B', '6.0', '2026-03-03 10:00:00', 90, 'Dir B', 22),
('mC', 300, 'Film C unreferenced', '2019-01-01', NULL, 'c', NULL, '2026-03-04 10:00:00', 80, 'Dir C', 33),
('mD', 400, 'Film D only excluded group', '2018-01-01', NULL, 'd', NULL, '2026-03-05 10:00:00', 80, 'Dir D', 44);
INSERT INTO \`movies\` ${MOVIE_COLS} VALUES
('mE', 500, '희망', '2020-01-01', NULL, 'e', NULL, '2026-03-06 10:00:00', 70, NULL, NULL);

INSERT INTO \`movie_genres\` (\`movie_id\`, \`genre_id\`) VALUES
('mA', 1),
('mB1', 1),
('mB2', 2),
('mB2', 3),
('mE', 3);

INSERT INTO \`projects\` (\`id\`, \`name\`, \`password_hash\`, \`created_at\`) VALUES
('p1', 'Proj', 'HASH', '2026-03-01 10:00:00');

INSERT INTO \`watchlist\` (\`id\`, \`movie_id\`, \`group_id\`, \`added_at\`, \`paid_by_member_id\`, \`paid_at\`) VALUES
(1, 'mA', 'g1', '2026-03-10 20:00:00', 2, '2026-04-01'),
(2, 'mB1', 'g1', '2026-03-11 20:00:00', NULL, NULL),
(3, 'mB2', 'g1', '2026-03-12 20:00:00', NULL, NULL),
(4, 'mA', 'g2', '2026-03-13 20:00:00', NULL, NULL),
(5, 'mE', 'g2', '2026-03-14 20:00:00', NULL, NULL),
(6, 'mD', 'g3', '2026-03-15 20:00:00', 4, '2026-04-02');

INSERT INTO \`watchlist_ratings\` (\`watchlist_id\`, \`member_id\`, \`rating\`, \`rated_at\`, \`seen_at\`, \`liked\`) VALUES
(1, 1, '4.5', '2026-04-02 21:00:00', '2026-04-02', 1),
(1, 2, '4.0', NULL, '2026-04-03', 0),
(1, 3, NULL, NULL, NULL, 0),
(2, 1, '3.0', NULL, NULL, 0),
(3, 1, '3.5', NULL, '2026-05-01', 1),
(2, 2, NULL, NULL, '2026-05-02', 0),
(3, 2, NULL, NULL, NULL, 0),
(4, 1, NULL, NULL, NULL, 1),
(4, 2, NULL, NULL, NULL, 0),
(5, 1, NULL, NULL, NULL, 0),
(6, 4, '5.0', NULL, NULL, 0);

COMMIT;
`;

module.exports = { FIXTURE_DUMP };
