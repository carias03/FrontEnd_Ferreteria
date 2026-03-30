/**
 * tabla.js
 * Wrapper de DataTables para FerreSystem.
 *
 * Uso:
 *   import { createTabla } from '../components/tabla.js';
 *
 *   const tabla = createTabla('#tabla-categorias', {
 *     columns: [...],
 *     data:    await categoriasApi.getAll(),
 *     order:   [[0, 'asc']], // índice de columna + dirección
 *   });
 *
 *   tabla.reload(nuevosDatos);
 *   tabla.destroy();
 */

import DataTable from "datatables.net";

export function createTabla(selector, options = {}) {
  const {
    columns = [],
    data = [],
    emptyText = "No hay registros para mostrar.",
    searching = true,
    paging = true,
    pageLength = 10,
    order = [[0, "asc"]],
  } = options;

  const dtColumns = columns.map((col) => {
    const base = {
      title: col.title,
      data: col.data ?? null,
      width: col.width,
      orderable: col.orderable ?? col.data !== null,
      className: col.className ?? "",
    };

    if (col.render) {
      base.render = (_data, _type, row) => col.render(row);
    }

    return base;
  });

  const dt = new DataTable(selector, {
    data,
    columns: dtColumns,
    order,
    searching,
    paging,
    pageLength,
    lengthMenu: [5, 10, 25, 50],
    language: {
      search: "Buscar:",
      lengthMenu: "Mostrar _MENU_ registros",
      info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
      infoEmpty: "Sin registros disponibles",
      infoFiltered: "(filtrado de _MAX_ registros totales)",
      zeroRecords: emptyText,
      emptyTable: emptyText,
      paginate: { first: "«", last: "»", next: "›", previous: "‹" },
    },
    dom: "<'dataTables_top'lf>t<'dataTables_bottom'ip>",
    autoWidth: false,
  });

  return {
    instance: dt,
    reload(newData) {
      dt.clear();
      dt.rows.add(newData);
      dt.draw();
    },
    destroy() {
      dt.destroy();
    },
  };
}
