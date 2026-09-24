import { useDesignStore } from '../store/useDesignStore'
import { NumberField } from './NumberField'

/** Project-wide board thicknesses; every board piece follows these. */
export function BoardSettings() {
  const thickness = useDesignStore((s) => s.thickness)
  const setThickness = useDesignStore((s) => s.setThickness)

  return (
    <section className="section">
      <h2>Boards</h2>
      <div className="stack">
        <NumberField
          label="Body thickness"
          value={thickness.body}
          onChange={(body) => setThickness({ body })}
        />
        <NumberField
          label="Back thickness"
          value={thickness.back}
          onChange={(back) => setThickness({ back })}
        />
      </div>
    </section>
  )
}
