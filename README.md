# RigForce

RigForce è una semplice webapp dimostrativa per il rigging di modelli 3D con un viewport in stile Blender.

## Struttura
- **index.html**: pagina di benvenuto con pulsante "Rig now".
- **app.html**: interfaccia principale con canvas Three.js e script per diversi formati.
- **app.js**: logica per caricare modelli (GLTF/OBJ/FBX), visualizzare texture, inserire joint manualmente e autorig completo per umanoidi, animali, uccelli e robot.

## Utilizzo
1. Apri `index.html` in un browser moderno.
2. Carica un modello `.gltf`/`.glb`/`.obj`/`.fbx`.
3. Scegli una modalità di rigging dal menu.
4. Posiziona joint manualmente cliccando sul modello (modalità manuale) oppure usa l'autorig per umanoidi, animali, uccelli o robot.
5. Premi **Esporta rig** per salvare un file JSON con le posizioni dei joint.

Questa è una versione semplificata a scopo di esempio.
