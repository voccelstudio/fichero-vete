# VetCare Pro 2.0 — App de escritorio (Electron)

Empaqueta la carpeta `../app` (la web offline) en un **único `.exe` portable** para el cliente.
No requiere Node ni Python en la máquina del cliente.

## Cómo funciona

`main.js` levanta un servidor HTTP local en un **puerto fijo** (`43687`) y muestra la app en una
ventana propia de Electron. El puerto es fijo a propósito: si cambiara, IndexedDB vería otro
"origen" y parecería que los datos se borran entre ejecuciones.

Los datos quedan guardados en la máquina del cliente en:

```
%APPDATA%\Republica Mascotas\
```

## Requisitos para compilar (solo en la máquina de desarrollo)

- Node.js 18+ (probado con Node 24)

## Compilar

```bash
cd desktop
npm install
# copia la web offline a desktop/web (se excluyen los launchers de navegador)
rm -rf web && mkdir web && cp -r ../app/. web/ && rm -f web/server.js web/start.bat web/start.sh web/LEEME.txt
npm run dist
```

El instalable queda en `desktop/dist/RepublicaMascotas-VetCarePro-2.0.0.exe`.

## Nota sobre Windows: error de *symlinks* en `winCodeSign`

En Windows, `electron-builder` suele fallar al extraer `winCodeSign` porque necesita crear
*symlinks* (requiere privilegios o "Modo para desarrolladores"):

```
ERROR: Cannot create symbolic link : A required privilege is not held by the client
```

Solución sin permisos de administrador: extraer el paquete a mano **sin la carpeta `darwin`**
(que es la única con *symlinks* y no se usa en Windows) en la caché que espera electron-builder:

```bash
CACHE="$LOCALAPPDATA/electron-builder/Cache/winCodeSign"
cd "$CACHE"
"<repo>/desktop/node_modules/7zip-bin/win/x64/7za.exe" x <archivo>.7z -o<archivo> -x!darwin -bd
cp -r <archivo> winCodeSign-2.6.0
```

## Verificación

```bash
npx electron selftest.js
```

Comprueba que la ventana carga, que los assets y la fuente de íconos se sirven bien y que
IndexedDB escribe/lee en el origen local.

## Firma

El `.exe` **no está firmado**, así que Windows SmartScreen puede mostrar un aviso la primera vez
("Más información" → "Ejecutar de todos modos"). Para quitarlo hay que firmar con un certificado.
