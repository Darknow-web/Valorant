# Conectar tu hoja de cálculo

## Lo primero: los resultados ya te van a llegar

El aplicativo ahora manda los datos **por dos caminos a la vez**, así que la
fila llega completa aunque tu hoja siga corriendo una versión antigua del Apps
Script. Si lo único que querías era dejar de ver *Desconocido*, *main* y *N/A*,
no tienes que hacer nada más.

Lo que sigue es para dejarlo **al día**, que trae dos ventajas: los resultados
se escriben por nombre de columna (da igual el orden de tu hoja) y un mismo
intento no se puede duplicar.

---

## Poner el script al día

1. Abre tu hoja de cálculo → **Extensiones ▸ Apps Script**.
2. Borra todo lo que haya y pega el contenido de `docs/apps-script.gs`.
3. **Implementar ▸ Gestionar implementaciones ▸ el lápiz (editar) ▸
   Versión: «Nueva versión» ▸ Implementar.**
4. **Quién tiene acceso: «Cualquier usuario».**

> ### El paso 3 es el que casi siempre se olvida
>
> En Apps Script, **guardar el código no cambia lo que responde tu URL**. La
> dirección que termina en `/exec` sigue sirviendo la última versión *publicada*.
> Puedes tener el código nuevo delante en el editor y que Google siga ejecutando
> el viejo. Por eso hay que publicar una **versión nueva**, no solo guardar.

---

## Comprobar que quedó bien

En el panel del entrenador, **Google Sheets y nota ▸ Probar conexión**. Te va a
responder una de tres cosas:

| Lo que dice | Qué significa |
|---|---|
| «Script al día (versión N)» | Todo correcto. |
| «La URL está sirviendo una versión ANTIGUA» | Los resultados llegan igual, pero falta el paso 3 de arriba. |
| «Google devolvió su página de inicio de sesión» | Falta el paso 4: el acceso no está en «Cualquier usuario». |

---

## Dos cosas que confunden a menudo

**La hoja es de cada entrenador.** La configuración se guarda por usuario. Si
pegas la URL mientras estás con el usuario `admin`, los colaboradores que entren
con el enlace de otro entrenador **no** llegan a esa hoja. Pégala con el usuario
del entrenador que comparte el enlace.

**No te va a partir los datos en dos pestañas.** Si ya tenías historial en
«Hoja 1», el script lo detecta por los títulos de las columnas y sigue
escribiendo ahí, en vez de crear una pestaña nueva.
