import { useEffect, useState } from 'react';
import { Dumbbell, Pause, Play } from 'lucide-react';
import { Modal } from './Modal';
import { getExerciseMedia } from '../data/exerciseMedia';

type MediaState = 'loading' | 'ready' | 'error';

function preload(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/**
 * Guía técnica de un ejercicio: demostración en movimiento más la indicación de
 * ejecución. El visor alterna el fotograma de inicio y el de fin, así que la
 * animación se consigue con dos JPG en lugar de un GIF (que pesa varias veces
 * más) y solo se descargan al abrir esta ventana.
 */
export function ExerciseTechniqueModal({
  name,
  notes,
  onClose,
}: {
  name: string;
  notes?: string | null;
  onClose: () => void;
}) {
  const media = getExerciseMedia(name);
  const [frame, setFrame] = useState<'start' | 'end'>('start');
  const [playing, setPlaying] = useState(true);
  const [state, setState] = useState<MediaState>(media ? 'loading' : 'error');
  // El fotograma de fin se pide después del de inicio: abrir el modal no espera
  // a los dos y el usuario igual ve la imagen en el primer instante.
  const [endReady, setEndReady] = useState(false);

  useEffect(() => {
    if (!media) return;
    let alive = true;
    setState('loading');
    setEndReady(false);
    preload(media.start).then((ok) => {
      if (alive) setState(ok ? 'ready' : 'error');
    });
    return () => {
      alive = false;
    };
  }, [media]);

  useEffect(() => {
    if (!media || state !== 'ready') return;
    let alive = true;
    preload(media.end).then((ok) => {
      if (alive) setEndReady(ok);
    });
    return () => {
      alive = false;
    };
  }, [media, state]);

  useEffect(() => {
    if (!playing || !endReady) return;
    const tick = () => {
      // En segundo plano nadie está mirando la demostración: se congela sola.
      if (document.visibilityState === 'hidden') return;
      setFrame((f) => (f === 'start' ? 'end' : 'start'));
    };
    const id = setInterval(tick, 700);
    return () => clearInterval(id);
  }, [playing, endReady]);

  const src = frame === 'start' ? media?.start : media?.end;

  return (
    <Modal onClose={onClose} labelledBy="technique-title">
      <div className="pr-10">
        <h2
          id="technique-title"
          className="text-lg font-bold text-slate-900 dark:text-white leading-snug"
        >
          {name}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Guía rápida de técnica</p>
      </div>

      {state === 'error' ? (
        <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-6 text-center">
          <Dumbbell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs text-slate-500">
            {media
              ? 'No se pudo cargar la demostración. Revisa tu conexión e inténtalo de nuevo.'
              : 'Este ejercicio no tiene demostración visual. Ten en cuenta la técnica descrita abajo.'}
          </p>
        </div>
      ) : (
        src && (
          <div className="mt-4 space-y-2">
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-square">
              <img
                src={src}
                alt={`Demostración de ${name}`}
                width={400}
                height={400}
                loading="lazy"
                decoding="async"
                onError={() => setState('error')}
                className="w-full h-full object-contain"
              />
              {state === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {state === 'ready' && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  {endReady ? 'Inicio y fin de la repetición' : 'Cargando animación…'}
                </p>
                <button
                  onClick={() => setPlaying((p) => !p)}
                  disabled={!endReady}
                  aria-label={playing ? 'Pausar demostración' : 'Reproducir demostración'}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 active:scale-[0.97] touch-action-manipulation disabled:opacity-40"
                >
                  {playing ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {playing ? 'Pausar' : 'Reproducir'}
                </button>
              </div>
            )}
          </div>
        )
      )}

      <div className="mt-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-500 dark:text-blue-400">
          Técnica
        </p>
        <p className="text-[13px] text-blue-900 dark:text-blue-200 leading-relaxed mt-1.5">
          {notes || 'Consulta las indicaciones del coach para este ejercicio.'}
        </p>
      </div>
    </Modal>
  );
}
