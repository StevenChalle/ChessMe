import { m } from '@/paraglide/messages'
import { LICHESS_MARKERS } from './criteria'

/** Lichess's judgements on our scale, as landmarks under the threshold sliders. */
export function lichessMarkers() {
  return [
    { value: LICHESS_MARKERS.inaccuracy, label: m.marker_inaccuracy() },
    { value: LICHESS_MARKERS.mistake, label: m.marker_mistake() },
    { value: LICHESS_MARKERS.blunder, label: m.marker_blunder() },
  ]
}
