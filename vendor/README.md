# Сторонний код и шрифты

Зафиксированные копии, чтобы сайт не зависел от чужих CDN (SECURITY.md, статья 6). Обновлять только осознанно: новая версия → проверка → обновить хеши здесь.

| Файл | Откуда | Версия | Лицензия |
|---|---|---|---|
| peerjs.min.js | npm `peerjs` | 1.5.4 | MIT |
| mediapipe/ | npm `@mediapipe/tasks-vision` | 0.10.14 | Apache-2.0 |
| fonts/unbounded-* | npm `@fontsource/unbounded` | 5.1.0 | OFL-1.1 |
| fonts/manrope-* | npm `@fontsource/manrope` | 5.1.0 | OFL-1.1 |

Модель лица не хранится здесь: она скачивается с storage.googleapis.com (Google) и используется, только если её SHA-256 равен
`64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` (совпадает в двух независимых копиях этого файла).

## SHA-256

```
d826ab6583b12c26807d8716a545bdbbb672df04f48608a364ba9efdbe501c30  ./fonts/Manrope.OFL.txt
48a780bc857729859e54d1e691b05792894a26634edc1c4b5dbeabffe6941758  ./fonts/Unbounded.OFL.txt
f0b06df61dca1d5a173e4ba8bdf5301f2070bec4986fb749e66ce0d5cb2193ea  ./fonts/manrope-cyrillic-400-normal.woff2
9d19f651631ad08f84a97103aa8fa159af32306c6076cbdb9f44fb1632123474  ./fonts/manrope-cyrillic-600-normal.woff2
6363f333064ff1e21cad0db1291d5272c6300dac0da35f0859034e99c1fac038  ./fonts/manrope-cyrillic-700-normal.woff2
87b933c1d28d9192885d290d1bbef9958dbc346cf05658d5468776c6d1c99e7f  ./fonts/manrope-latin-400-normal.woff2
4b52f2bf3d110469312cbedd409316b145c19be8cb792a17fa6ba91a91ebb23e  ./fonts/manrope-latin-600-normal.woff2
a97cf33c625a19ecd47ffb685ff3d140fee83b441c4297ccfed3d300e79757a7  ./fonts/manrope-latin-700-normal.woff2
df6e1161e1d3028e87dc0a7a147f2d631db4fa23ff0f5db1b5a9a3cf945763f9  ./fonts/unbounded-cyrillic-600-normal.woff2
6c6986b1ce089f5929378f1af41524a7a97d78bab0e2bdfcb44bd1d293aa54cc  ./fonts/unbounded-cyrillic-800-normal.woff2
1a41e0b7333572024f0de8133c4c1bc80cc252c6470a9f76fe39eecedb44dae0  ./fonts/unbounded-latin-600-normal.woff2
af06207654d494c419a6b7c4f9c87b21518e5e6f5dde496f8431a3ef97b107b3  ./fonts/unbounded-latin-800-normal.woff2
e77f281f9619150d937023c355bae170e9120e3b9e43f1e23a2a7bee07197669  ./mediapipe/vision_bundle.mjs
9440cf0cc0cea21800e31581ec32aeedcc5fbf9df4509796bbc7d3f99e52ab9c  ./mediapipe/wasm/vision_wasm_internal.js
f82a8e6c05e08a44cc9f9e7ec5f845935bcbb1b1500ebe8c2f4812fb4e2917dc  ./mediapipe/wasm/vision_wasm_internal.wasm
abe9b6fbeaf86fcb53a5edce3926c82ccb0619e18fed4d9d9ce561ee7f55e054  ./mediapipe/wasm/vision_wasm_nosimd_internal.js
38b61feab2fd7934e05cbe9f68baa308978a5e3b7f85c1913bb8ae89b8ef8b97  ./mediapipe/wasm/vision_wasm_nosimd_internal.wasm
9407807dba7f47a79bfb3ac55759d63d77c9371ebd0616d5a093e97d3e810397  ./peerjs.LICENSE
ad5d8870d1e389914f9cba8d35be313c4327c69ee0a221e482e9bf7621136fe5  ./peerjs.min.js
```
