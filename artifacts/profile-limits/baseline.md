# Profile Limits Baseline

Fixtures: react-vite, vue-vite, runtime-npm, firebase-with-functions, monorepo-turbo, monorepo-pnpm-workspace
Profiles: compact, standard, full
Encodings: cl100k_base, o200k_base

## Error metrics by encoding

| Encoding | Mean abs % error | P50 | P95 | Max | Mean delta tokens |
|---|---:|---:|---:|---:|---:|
| cl100k_base | 11.57 | 12.86 | 20.45 | 22.05 | 141.22 |
| o200k_base | 14.18 | 16.7 | 22.95 | 23.64 | 178.39 |

## Profile shape (estimated baseline)

| Profile | Cases | Lines min/max/avg | Estimated tokens min/max/avg |
|---|---:|---|---|
| compact | 6 | 32/88/61.33 | 195/687/451.5 |
| standard | 6 | 130/168/150.83 | 1050/1609/1288.83 |
| full | 6 | 201/250/223 | 1695/2380/1943.67 |

## Cases

| Fixture | Profile | Lines | Estimated tokens | cl100k_base real tokens | cl100k_base abs error % | o200k_base real tokens | o200k_base abs error % |
| --- | --- | --- | --- | --- | --- | --- | --- |
| react-vite | compact | 70 | 507 | 528 | 3.98 | 498 | 1.81 |
| react-vite | standard | 150 | 1215 | 1107 | 9.76 | 1071 | 13.45 |
| react-vite | full | 220 | 1845 | 1610 | 14.6 | 1577 | 16.99 |
| vue-vite | compact | 47 | 283 | 314 | 9.87 | 293 | 3.41 |
| vue-vite | standard | 130 | 1050 | 932 | 12.66 | 902 | 16.41 |
| vue-vite | full | 201 | 1695 | 1445 | 17.3 | 1419 | 19.45 |
| runtime-npm | compact | 32 | 195 | 203 | 3.94 | 183 | 6.56 |
| runtime-npm | standard | 168 | 1609 | 1339 | 20.16 | 1310 | 22.82 |
| runtime-npm | full | 250 | 2380 | 1950 | 22.05 | 1925 | 23.64 |
| firebase-with-functions | compact | 61 | 499 | 490 | 1.84 | 463 | 7.78 |
| firebase-with-functions | standard | 140 | 1222 | 1066 | 14.63 | 1033 | 18.3 |
| firebase-with-functions | full | 210 | 1854 | 1568 | 18.24 | 1537 | 20.62 |
| monorepo-turbo | compact | 88 | 687 | 722 | 4.85 | 667 | 3 |
| monorepo-turbo | standard | 168 | 1399 | 1283 | 9.04 | 1223 | 14.39 |
| monorepo-turbo | full | 238 | 2025 | 1777 | 13.96 | 1719 | 17.8 |
| monorepo-pnpm-workspace | compact | 70 | 538 | 544 | 1.1 | 495 | 8.69 |
| monorepo-pnpm-workspace | standard | 149 | 1238 | 1095 | 13.06 | 1041 | 18.92 |
| monorepo-pnpm-workspace | full | 219 | 1863 | 1589 | 17.24 | 1537 | 21.21 |

