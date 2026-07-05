import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

const BROWN = '#5D3A2C';
const BEIGE = '#F5EDE8';
const GREEN = '#3E6641';
const GRAY = '#6B7280';

const baseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Helvetica, Arial, sans-serif; background: #fff; color: #1F2937; font-size: 12px; }
  .page { padding: 32px; max-width: 800px; margin: 0 auto; }
  .header { background: ${BROWN}; color: white; padding: 24px 28px; border-radius: 12px; margin-bottom: 24px; }
  .header-title { font-size: 22px; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px; }
  .header-sub { font-size: 12px; opacity: 0.8; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: 800; color: ${BROWN}; text-transform: uppercase;
    letter-spacing: 1.5px; border-bottom: 2px solid ${BEIGE}; padding-bottom: 6px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: ${BEIGE}; color: ${BROWN}; font-size: 10px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 1px; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #F3F4F6; font-size: 12px; color: #374151; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; }
  .badge-green { background: #DCFCE7; color: ${GREEN}; }
  .badge-orange { background: #FEF3C7; color: #D97706; }
  .badge-red { background: #FEE2E2; color: #DC2626; }
  .badge-gray { background: #F3F4F6; color: ${GRAY}; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .info-box { background: #F9FAFB; border-radius: 10px; padding: 14px; }
  .info-label { font-size: 9px; font-weight: 800; color: ${GRAY}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .info-value { font-size: 13px; font-weight: 700; color: #111827; }
  .footer { margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 12px;
    font-size: 10px; color: ${GRAY}; display: flex; justify-content: space-between; }
  .no-data { color: ${GRAY}; font-style: italic; font-size: 11px; }
  .alert-row td { background: #FFFBEB; }
`;

function fmt(value: any, suffix = ''): string {
  if (value === undefined || value === null || value === '') return '—';
  return `${value}${suffix}`;
}

function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

function duracion(inicio: string | undefined | null, fin: string | undefined | null): string {
  if (!inicio || !fin) return '—';
  try {
    const diff = new Date(fin).getTime() - new Date(inicio).getTime();
    const dias = Math.floor(diff / 86400000);
    return `${dias} día${dias !== 1 ? 's' : ''}`;
  } catch { return '—'; }
}

// ─── Detección de incidencias (misma lógica que checkIncidenceAlerts) ────────

function computeAlertas(phaseId: string, m: any): { titulo: string; msg: string }[] {
  const n = (v: any) => (v === undefined || v === null || v === '') ? null : Number(v);
  const out: { titulo: string; msg: string }[] = [];

  if (phaseId === 'Germinacion') {
    const tasa = n(m.tasa_germinacion), dias = n(m.dias_emergencia);
    if (tasa !== null && tasa < 80)
      out.push({ titulo: 'Baja Tasa de Germinación', msg: 'El porcentaje de germinación menor al 80% indica problemas de viabilidad de la semilla o mal manejo de humedad/temperatura.' });
    if (dias !== null && dias > 75)
      out.push({ titulo: 'Surgimiento Retrasado', msg: 'Pasarse de los 75 días es sinónimo de pérdidas por hongos o debilidad estructural en la planta.' });
    if (m.presencia_hongos && m.presencia_hongos !== 'Ninguna')
      out.push({ titulo: 'Presencia de Hongos', msg: `Se ha detectado una presencia ${String(m.presencia_hongos).toLowerCase()} de hongos. Se recomienda aplicar tratamiento fungicida preventivo.` });
  }

  if (phaseId === 'Vivero') {
    const hojas = n(m.pares_hojas_verdaderas), altura = n(m.altura_plantula);
    if (hojas !== null && hojas < 2)
      out.push({ titulo: 'Planta Demasiado Joven', msg: 'La planta es demasiado joven; su sistema de raíces no se ha desarrollado lo suficiente.' });
    if (hojas !== null && hojas > 8)
      out.push({ titulo: 'Planta Pasada de Tiempo', msg: 'La planta se ha "pasado de tiempo" en la bolsa.' });
    if (altura !== null && altura < 15)
      out.push({ titulo: 'Tallo muy Corto', msg: 'El tallo es muy corto y frágil; la maleza o acumulación de tierra podrían asfixiarla en campo.' });
    if (altura !== null && altura > 35)
      out.push({ titulo: 'Tallo muy Largo (Hilvanado)', msg: 'La planta sufrió hilvanado por exceso de sombra; el tallo es largo pero muy débil ante el viento.' });
  }

  if (phaseId === 'Crecimiento') {
    const indice = n(m.indice_crecimiento), grosor = n(m.grosor_tallo);
    const bandolas = n(m.formacion_bandolas), foliar = n(m.incidencia_foliar);
    if (indice !== null && indice < 0.50)
      out.push({ titulo: 'Retraso de Desarrollo', msg: 'Retraso severo en el desarrollo (enanismo). Verificar compactación del suelo o presencia de nematodos.' });
    if (indice !== null && indice > 2.20)
      out.push({ titulo: 'Crecimiento Excesivo', msg: 'Planta demasiado alta; se dificulta la recolección manual y se pierde eficiencia productiva.' });
    if (grosor !== null && grosor < 10)
      out.push({ titulo: 'Tallo Raquítico', msg: 'Tallo raquítico o hilado; la planta carece de la fuerza estructural para sostener futuras cosechas.' });
    if (grosor !== null && grosor > 60)
      out.push({ titulo: 'Grosor Desproporcionado', msg: 'Posible desbalance nutricional por exceso de fertilización dirigida únicamente al tronco.' });
    if (bandolas !== null && bandolas < 10)
      out.push({ titulo: 'Bandolas Deficientes', msg: 'Pocas ramas se traducirán directamente en una baja o nula producción de café.' });
    if (bandolas !== null && bandolas > 50)
      out.push({ titulo: 'Exceso de Densidad Foliar', msg: 'La sombra interna puede arruinar la maduración y crear un microclima propenso a hongos.' });
    if (foliar !== null && foliar > 15)
      out.push({ titulo: 'Incidencia Foliar Crítica', msg: 'Ataque severo de plagas o enfermedades detectado. Riesgo inminente de defoliación; aplique tratamiento fitosanitario.' });
    else if (foliar !== null && foliar > 10)
      out.push({ titulo: 'Alta Incidencia Foliar', msg: 'La incidencia foliar supera el 10%. Revise el estado nutricional y sanitario de las hojas.' });
  }

  if (phaseId === 'Maduracion') {
    const cuajado = n(m.porcentaje_cuajado), broca = n(m.incidencia_broca), brix = n(m.grados_brix);
    if (cuajado !== null && cuajado < 60)
      out.push({ titulo: 'Bajo Cuajado de Fruto', msg: 'Baja eficiencia de amarre de fruto; se proyecta una pérdida significativa en el rendimiento de la cosecha.' });
    if (broca !== null && broca > 5)
      out.push({ titulo: 'Incidencia de Broca Crítica', msg: 'La incidencia de Broca supera el 5%. Se requiere la creación de una incidencia técnica obligatoria.' });
    else if (broca !== null && broca > 3)
      out.push({ titulo: 'Alerta de Plaga', msg: 'La incidencia de broca supera el límite permitido, poniendo en riesgo la calidad física del grano.' });
    if (brix !== null && brix < 14)
      out.push({ titulo: 'Baja Concentración de Azúcares', msg: 'Posible deficiencia nutricional o estrés hídrico que afectará el dulzor y notas de sabor del café.' });
    if (brix !== null && brix > 22)
      out.push({ titulo: 'Maduración Acelerada', msg: 'Maduración acelerada por golpe de calor o deshidratación interna del fruto; verificar uniformidad del lote.' });
  }

  return out;
}

function alertasHTML(alertas: { titulo: string; msg: string }[]): string {
  if (alertas.length === 0) return '';
  return `
  <div style="margin-top:10px;padding:10px 14px;background:#FFFBEB;border-left:3px solid #D97706;border-radius:0 6px 6px 0;">
    <div style="font-size:9px;font-weight:800;color:#D97706;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">⚠ Incidencias detectadas</div>
    ${alertas.map(a => `<div style="margin-bottom:4px;"><span style="font-weight:700;font-size:11px;color:#92400E;">${a.titulo}:</span> <span style="font-size:11px;color:#78350F;">${a.msg}</span></div>`).join('')}
  </div>`;
}

// ─── SEMBRADO ────────────────────────────────────────────────────────────────

export async function generarInformeSembrado(
  lote: any,
  dbMetrics: Record<string, any>,
  encargados: { first_name?: string; last_name?: string; email?: string; etapa?: string }[] = []
): Promise<void> {
  const g = dbMetrics['Germinacion'] || {};
  const v = dbMetrics['Vivero'] || {};
  const c = dbMetrics['Crecimiento'] || {};
  const f = dbMetrics['Floracion'] || {};
  const m = dbMetrics['Maduracion'] || {};

  const hongoBadge = (h: string) => {
    if (!h || h === 'Ninguna') return `<span class="badge badge-green">Ninguna</span>`;
    if (h === 'Leve') return `<span class="badge badge-orange">Leve</span>`;
    return `<span class="badge badge-red">${h}</span>`;
  };

  const vigorBadge = (val: string) => {
    if (val === 'Optimo') return `<span class="badge badge-green">Óptimo</span>`;
    if (val === 'Aceptable') return `<span class="badge badge-orange">Aceptable</span>`;
    if (val === 'Deformado') return `<span class="badge badge-red">Deformado</span>`;
    return `<span class="badge badge-gray">${val || '—'}</span>`;
  };

  const intensidadBadge = (val: string) => {
    if (val === 'Abundante') return `<span class="badge badge-green">Abundante</span>`;
    if (val === 'Media') return `<span class="badge badge-orange">Media</span>`;
    if (val === 'Escasa') return `<span class="badge badge-red">Escasa</span>`;
    return `<span class="badge badge-gray">${val || '—'}</span>`;
  };

  const uniformidadBadge = (val: string) => {
    if (val === 'Homogenea') return `<span class="badge badge-green">Homogénea</span>`;
    if (val === 'Dispareja') return `<span class="badge badge-orange">Dispareja</span>`;
    return `<span class="badge badge-gray">${val || '—'}</span>`;
  };

  const estresBadge = (val: string) => {
    if (val === 'Lluvia_ligera') return `<span class="badge badge-green">Lluvia ligera</span>`;
    if (val === 'Seco') return `<span class="badge badge-orange">Seco</span>`;
    if (val === 'Tormenta') return `<span class="badge badge-red">Tormenta</span>`;
    return `<span class="badge badge-gray">${val || '—'}</span>`;
  };

  const homogeneidadBadge = (val: string) => {
    if (val === 'Uniforme') return `<span class="badge badge-green">Uniforme</span>`;
    if (val === 'Irregular') return `<span class="badge badge-orange">Irregular</span>`;
    return `<span class="badge badge-gray">${val || '—'}</span>`;
  };

  const alertasG = computeAlertas('Germinacion', g);
  const alertasV = computeAlertas('Vivero', v);
  const alertasC = computeAlertas('Crecimiento', c);
  const alertasM = computeAlertas('Maduracion', m);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>${baseStyles}</style></head><body><div class="page">

  <div class="header">
    <div class="header-title">Informe Técnico de Sembrado</div>
    <div class="header-sub">
      Lote: ${lote?.codigo || '—'} &nbsp;·&nbsp;
      Parcela: ${lote?.parcela?.nombre || lote?.parcela_id || '—'} &nbsp;·&nbsp;
      Generado: ${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
    </div>
  </div>

  <!-- EQUIPO TÉCNICO -->
  ${encargados.length > 0 ? `
  <div class="section">
    <div class="section-title">Equipo Técnico Asignado</div>
    <table>
      <tr><th>Nombre</th><th>Correo</th><th>Etapa</th></tr>
      ${encargados.map(e => `
      <tr>
        <td>${[e.first_name, e.last_name].filter(Boolean).join(' ') || '—'}</td>
        <td>${e.email || '—'}</td>
        <td>${e.etapa || '—'}</td>
      </tr>`).join('')}
    </table>
  </div>` : ''}

  <!-- GERMINACIÓN -->
  <div class="section">
    <div class="section-title">Subetapa de Germinación</div>
    ${Object.keys(g).length === 0
      ? '<p class="no-data">Sin datos registrados para esta subetapa.</p>'
      : `
    <table>
      <tr><th>Métrica</th><th>Valor registrado</th><th>Inicio</th><th>Fin</th><th>Duración</th></tr>
      <tr>
        <td>Tasa de Germinación</td>
        <td>${fmt(g.tasa_germinacion, '%')}</td>
        <td>${fmtDate(g.fecha_inicio)}</td>
        <td>${fmtDate(g.fecha_fin)}</td>
        <td>${duracion(g.fecha_inicio, g.fecha_fin)}</td>
      </tr>
      <tr>
        <td>Días de Emergencia</td>
        <td>${fmt(g.dias_emergencia, ' días')}</td>
        <td colspan="3"></td>
      </tr>
      <tr>
        <td>Presencia de Hongos</td>
        <td>${hongoBadge(g.presencia_hongos)}</td>
        <td colspan="3"></td>
      </tr>
    </table>`}
    ${alertasHTML(alertasG)}
  </div>

  <!-- VIVERO -->
  <div class="section">
    <div class="section-title">Subetapa de Vivero</div>
    ${Object.keys(v).length === 0
      ? '<p class="no-data">Sin datos registrados para esta subetapa.</p>'
      : `
    <table>
      <tr><th>Métrica</th><th>Valor registrado</th><th>Inicio</th><th>Fin</th><th>Duración</th></tr>
      <tr>
        <td>Pares de Hojas Verdaderas</td>
        <td>${fmt(v.pares_hojas_verdaderas, ' pares')}</td>
        <td>${fmtDate(v.fecha_inicio)}</td>
        <td>${fmtDate(v.fecha_fin)}</td>
        <td>${duracion(v.fecha_inicio, v.fecha_fin)}</td>
      </tr>
      <tr>
        <td>Altura de Plántula</td>
        <td>${fmt(v.altura_plantula, ' cm')}</td>
        <td colspan="3"></td>
      </tr>
      <tr>
        <td>Vigor Radicular</td>
        <td>${vigorBadge(v.vigor_radicular)}</td>
        <td colspan="3"></td>
      </tr>
    </table>`}
    ${alertasHTML(alertasV)}
  </div>

  <!-- CRECIMIENTO -->
  <div class="section">
    <div class="section-title">Subetapa de Crecimiento</div>
    ${Object.keys(c).length === 0
      ? '<p class="no-data">Sin datos registrados para esta subetapa.</p>'
      : `
    <table>
      <tr><th>Métrica</th><th>Valor registrado</th><th>Inicio</th><th>Fin</th><th>Duración</th></tr>
      <tr>
        <td>Índice de Crecimiento</td>
        <td>${fmt(c.indice_crecimiento, ' m')}</td>
        <td>${fmtDate(c.fecha_inicio)}</td>
        <td>${fmtDate(c.fecha_fin)}</td>
        <td>${duracion(c.fecha_inicio, c.fecha_fin)}</td>
      </tr>
      <tr><td>Grosor de Tallo</td><td>${fmt(c.grosor_tallo, ' mm')}</td><td colspan="3"></td></tr>
      <tr><td>Formación de Bandolas</td><td>${fmt(c.formacion_bandolas, ' bandolas')}</td><td colspan="3"></td></tr>
      <tr><td>Incidencia Foliar</td><td>${fmt(c.incidencia_foliar, '%')}</td><td colspan="3"></td></tr>
    </table>`}
    ${alertasHTML(alertasC)}
  </div>

  <!-- FLORACIÓN -->
  <div class="section">
    <div class="section-title">Subetapa de Floración</div>
    ${Object.keys(f).length === 0
      ? '<p class="no-data">Sin datos registrados para esta subetapa.</p>'
      : `
    <table>
      <tr><th>Métrica</th><th>Valor registrado</th><th>Inicio</th><th>Fin</th><th>Duración</th></tr>
      <tr>
        <td>Intensidad de Floración</td>
        <td>${intensidadBadge(f.intensidad_floracion)}</td>
        <td>${fmtDate(f.fecha_inicio)}</td>
        <td>${fmtDate(f.fecha_fin)}</td>
        <td>${duracion(f.fecha_inicio, f.fecha_fin)}</td>
      </tr>
      <tr><td>Uniformidad de Floración</td><td>${uniformidadBadge(f.uniformidad_floracion)}</td><td colspan="3"></td></tr>
      <tr><td>Estrés Hídrico</td><td>${estresBadge(f.estres_hidrico)}</td><td colspan="3"></td></tr>
    </table>`}
  </div>

  <!-- MADURACIÓN -->
  <div class="section">
    <div class="section-title">Subetapa de Maduración</div>
    ${Object.keys(m).length === 0
      ? '<p class="no-data">Sin datos registrados para esta subetapa.</p>'
      : `
    <table>
      <tr><th>Métrica</th><th>Valor registrado</th><th>Inicio</th><th>Fin</th><th>Duración</th></tr>
      <tr>
        <td>Porcentaje de Cuajado</td>
        <td>${fmt(m.porcentaje_cuajado, '%')}</td>
        <td>${fmtDate(m.fecha_inicio)}</td>
        <td>${fmtDate(m.fecha_fin)}</td>
        <td>${duracion(m.fecha_inicio, m.fecha_fin)}</td>
      </tr>
      <tr><td>Homogeneidad de Maduración</td><td>${homogeneidadBadge(m.homogeneidad_maduracion)}</td><td colspan="3"></td></tr>
      <tr><td>Incidencia de Broca</td><td>${fmt(m.incidencia_broca, '%')}</td><td colspan="3"></td></tr>
      <tr><td>Grados Brix</td><td>${fmt(m.grados_brix, '°')}</td><td colspan="3"></td></tr>
    </table>`}
    ${alertasHTML(alertasM)}
  </div>

  <div class="footer">
    <span>Sistema de Gestión de Trazabilidad de Café · SGTC</span>
    <span>Informe generado automáticamente</span>
  </div>

  </div></body></html>`;

  await _compartirPDF(html, `Informe_Sembrado_${lote?.codigo || 'lote'}`);
}

// ─── COSECHA ─────────────────────────────────────────────────────────────────

export async function generarInformeCosecha(
  lote: any,
  cosecha: any,
  workers: { nombre: string; cantidad_cosechada: number; tipo_grano: string; pago_calculado: number }[]
): Promise<void> {
  const totalKg = workers.reduce((sum, w) => sum + (w.cantidad_cosechada || 0), 0);
  const totalPago = workers.reduce((sum, w) => sum + (w.pago_calculado || 0), 0);

  const granoBadge = (tipo: string) => {
    if (tipo === 'Rojo') return `<span class="badge badge-red">Rojo</span>`;
    if (tipo === 'Verde') return `<span class="badge badge-green">Verde</span>`;
    return `<span class="badge badge-orange">Variado</span>`;
  };

  const workersRows = workers.length === 0
    ? `<tr><td colspan="4" class="no-data" style="padding:12px">Sin trabajadores registrados.</td></tr>`
    : workers.map(w => `
      <tr>
        <td>${w.nombre}</td>
        <td>${w.cantidad_cosechada ?? '—'} kg</td>
        <td>${granoBadge(w.tipo_grano)}</td>
        <td>$${(w.pago_calculado ?? 0).toFixed(2)}</td>
      </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>${baseStyles}</style></head><body><div class="page">

  <div class="header">
    <div class="header-title">Informe de Cosecha Selectiva</div>
    <div class="header-sub">
      Lote: ${lote?.codigo || '—'} &nbsp;·&nbsp;
      Parcela: ${lote?.parcela?.nombre || lote?.parcela_id || '—'} &nbsp;·&nbsp;
      Generado: ${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
    </div>
  </div>

  <!-- DATOS GENERALES -->
  <div class="section">
    <div class="section-title">Datos Generales</div>
    <div class="two-col">
      <div class="info-box">
        <div class="info-label">Grados Brix</div>
        <div class="info-value">${fmt(cosecha?.grados_brix, '°')}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Fecha de Cosecha</div>
        <div class="info-value">${fmtDate(cosecha?.fecha_cosecha || cosecha?.fecha_inicio)}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Total Recolectado</div>
        <div class="info-value">${totalKg.toFixed(1)} kg</div>
      </div>
      <div class="info-box">
        <div class="info-label">Pago Total</div>
        <div class="info-value">$${totalPago.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <!-- TRABAJADORES -->
  <div class="section">
    <div class="section-title">Producción por Trabajador</div>
    <table>
      <tr><th>Trabajador</th><th>Cantidad recolectada</th><th>Tipo de grano</th><th>Pago calculado</th></tr>
      ${workersRows}
      ${workers.length > 0 ? `
      <tr style="font-weight:800; background:${BEIGE}">
        <td>TOTAL</td>
        <td>${totalKg.toFixed(1)} kg</td>
        <td>—</td>
        <td>$${totalPago.toFixed(2)}</td>
      </tr>` : ''}
    </table>
  </div>

  <!-- OBSERVACIONES -->
  <div class="section">
    <div class="section-title">Observaciones</div>
    <div class="info-box">
      <p style="font-size:12px; color:#374151; line-height:1.6">
        ${cosecha?.observaciones || '<span class="no-data">Sin observaciones registradas.</span>'}
      </p>
    </div>
  </div>

  <div class="footer">
    <span>Sistema de Gestión de Trazabilidad de Café · SGTC</span>
    <span>Informe generado automáticamente</span>
  </div>

  </div></body></html>`;

  await _compartirPDF(html, `Informe_Cosecha_${lote?.codigo || 'lote'}`);
}

// ─── Helper interno ───────────────────────────────────────────────────────────

async function _compartirPDF(html: string, nombreBase: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const cleanName = nombreBase.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const destFile = new File(Paths.cache, cleanName + '.pdf');
  if (destFile.exists) destFile.delete();
  new File(uri).move(destFile);
  const disponible = await Sharing.isAvailableAsync();
  if (disponible) {
    await Sharing.shareAsync(destFile.uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Compartir ${nombreBase}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
