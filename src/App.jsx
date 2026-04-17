import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import * as XLSX from 'xlsx'

const WHATSAPP_NUMBER = '549247415473256'

const styles = {
  page: {
    padding: 16,
    fontFamily: 'Arial, sans-serif',
    maxWidth: 520,
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  card: {
    border: '1px solid #d9d9d9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  input: {
    padding: 12,
    width: '100%',
    fontSize: 16,
    boxSizing: 'border-box',
    marginBottom: 10,
    borderRadius: 8,
    border: '1px solid #cfcfcf',
  },
  textarea: {
    padding: 12,
    width: '100%',
    height: 90,
    fontSize: 16,
    boxSizing: 'border-box',
    marginBottom: 10,
    borderRadius: 8,
    border: '1px solid #cfcfcf',
    resize: 'vertical',
  },
  button: {
    padding: '12px 16px',
    width: '100%',
    fontSize: 16,
    marginBottom: 10,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#111827',
    color: '#ffffff',
  },
  buttonSecondary: {
    padding: '12px 16px',
    width: '100%',
    fontSize: 16,
    marginBottom: 10,
    borderRadius: 8,
    border: '1px solid #cfcfcf',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  buttonDanger: {
    padding: '8px 10px',
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #ef4444',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    color: '#ef4444',
    marginRight: 6,
  },
  buttonSmall: {
    padding: '8px 10px',
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #cfcfcf',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    color: '#111827',
    marginRight: 6,
    minWidth: 56,
  },
  quickButtonsWrap: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  infoBox: {
    border: '1px solid #d9d9d9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
  },
  tableWrap: {
    overflowX: 'auto',
    marginBottom: 12,
  },
  table: {
    borderCollapse: 'collapse',
    minWidth: 520,
    width: '100%',
  },
  thtd: {
    border: '1px solid #d9d9d9',
    padding: 8,
    textAlign: 'left',
    fontSize: 14,
    verticalAlign: 'top',
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    marginTop: 0,
    marginBottom: 12,
  },
  message: {
    marginTop: 12,
    fontWeight: 'bold',
  },
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)

  const [productos, setProductos] = useState([])
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState([])
  const [historial, setHistorial] = useState([])

  const [editandoIndex, setEditandoIndex] = useState(null)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false)
  const [ultimoPedidoGuardado, setUltimoPedidoGuardado] = useState(null)

  const cantidadRef = useRef(null)
  const productoRef = useRef(null)

  const pasosEspeciales = {
    5: 5,
    21: 5,
    3: 20,
    62: 20,
    592: 20,
  }

  const getPasoProducto = () => {
    const producto = productos.find(
      (p) => String(p.id) === productoSeleccionado
    )

    if (!producto) return 1

    return pasosEspeciales[producto.codigo] || 1
  }

  const getBotonesRapidos = () => {
    const paso = getPasoProducto()
    if (paso === 5) return [5, 10, 15, 20, 25, 30, 35, 40, 45]
    if (paso === 20) return [20, 40, 60, 80, 100, 120]
    return []
  }

  const cargarPerfil = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    setUsuario(user)

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        usuario,
        sucursal_id,
        sucursales(nombre)
      `)
      .eq('id', user.id)
      .single()

    if (error) {
      console.error(error)
      setMensaje('❌ Login ok, pero no se encontró el perfil')
      return null
    }

    setPerfil(data)
    return data
  }

  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('id, codigo, nombre')
      .order('codigo', { ascending: true })

    if (error) {
      console.error(error)
      setMensaje('❌ Error cargando productos')
      return
    }

    setProductos(data || [])
  }

  const cargarHistorial = async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id,
        created_at,
        observaciones,
        pedido_detalle (
          id,
          codigo,
          articulo,
          cantidad
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setMensaje('❌ Error cargando historial')
      return
    }

    setHistorial(data || [])
  }

  const login = async () => {
    setMensaje('Ingresando...')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error(error)
      setMensaje('❌ Usuario o clave incorrectos')
      return
    }

    const perfilCargado = await cargarPerfil()
    await cargarProductos()

    if (perfilCargado) {
      await cargarHistorial()
      setMensaje('✅ Login correcto')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUsuario(null)
    setPerfil(null)
    setProductos([])
    setItems([])
    setHistorial([])
    setPedidoConfirmado(false)
    setUltimoPedidoGuardado(null)
    setMensaje('Sesión cerrada')
  }

  const limpiarPedidoActual = () => {
    setProductoSeleccionado('')
    setCantidad('')
    setObservaciones('')
    setItems([])
    setEditandoIndex(null)
    setPedidoConfirmado(false)
    setUltimoPedidoGuardado(null)
    setMensaje('')
  }

  const onSeleccionProducto = (valor) => {
    setProductoSeleccionado(valor)

    setTimeout(() => {
      if (cantidadRef.current) {
        cantidadRef.current.focus()
        cantidadRef.current.select()
      }
    }, 100)
  }

  const agregarOActualizarItem = () => {
    if (pedidoConfirmado) {
      setMensaje('❌ El pedido ya fue confirmado. Iniciá uno nuevo.')
      return
    }

    if (!productoSeleccionado || !cantidad || Number(cantidad) <= 0) {
      setMensaje('❌ Elegí producto y cantidad válida')
      return
    }

    const producto = productos.find((p) => String(p.id) === productoSeleccionado)

    if (!producto) {
      setMensaje('❌ Producto no encontrado')
      return
    }

    const paso = getPasoProducto()

    if (paso > 1 && Number(cantidad) % paso !== 0) {
      setMensaje(`❌ Este producto se carga de ${paso} en ${paso}`)
      return
    }

    if (editandoIndex !== null) {
      const nuevos = [...items]
      nuevos[editandoIndex] = {
        ...nuevos[editandoIndex],
        producto_id: producto.id,
        codigo: producto.codigo,
        articulo: producto.nombre,
        cantidad: Number(cantidad),
      }
      setItems(nuevos)
      setEditandoIndex(null)
      setMensaje('✅ Item actualizado')
    } else {
      const existe = items.find((i) => i.producto_id === producto.id)

      if (existe) {
        const nuevos = items.map((i) =>
          i.producto_id === producto.id
            ? { ...i, cantidad: Number(i.cantidad) + Number(cantidad) }
            : i
        )
        setItems(nuevos)
      } else {
        setItems([
          ...items,
          {
            producto_id: producto.id,
            codigo: producto.codigo,
            articulo: producto.nombre,
            cantidad: Number(cantidad),
          },
        ])
      }
      setMensaje('✅ Item agregado')
    }

    setProductoSeleccionado('')
    setCantidad('')

    setTimeout(() => {
      productoRef.current?.focus()
    }, 50)
  }

  const editarItem = (index) => {
    const item = items[index]
    setProductoSeleccionado(String(item.producto_id))
    setCantidad(String(item.cantidad))
    setEditandoIndex(index)
    setMensaje('Editando item...')

    setTimeout(() => {
      if (cantidadRef.current) {
        cantidadRef.current.focus()
        cantidadRef.current.select()
      }
    }, 100)
  }

  const eliminarItem = (index) => {
    if (pedidoConfirmado) {
      setMensaje('❌ El pedido ya fue confirmado. Iniciá uno nuevo.')
      return
    }

    const nuevos = items.filter((_, i) => i !== index)
    setItems(nuevos)

    if (editandoIndex === index) {
      setEditandoIndex(null)
      setProductoSeleccionado('')
      setCantidad('')
    }

    setMensaje('✅ Item eliminado')
  }

  const confirmarPedido = async () => {
    if (!perfil) {
      setMensaje('❌ No hay perfil cargado')
      return
    }

    if (items.length === 0) {
      setMensaje('❌ No hay items para guardar')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMensaje('❌ Usuario no autenticado')
      return
    }

    setMensaje('Guardando pedido...')

    const { data: pedido, error: errorPedido } = await supabase
      .from('pedidos')
      .insert({
        usuario_id: user.id,
        sucursal_id: perfil.sucursal_id,
        observaciones,
        estado: 'confirmado',
      })
      .select()
      .single()

    if (errorPedido) {
      console.error(errorPedido)
      setMensaje('❌ Error guardando cabecera del pedido')
      return
    }

    const detalle = items.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      codigo: item.codigo,
      articulo: item.articulo,
      cantidad: item.cantidad,
    }))

    const { error: errorDetalle } = await supabase
      .from('pedido_detalle')
      .insert(detalle)

    if (errorDetalle) {
      console.error(errorDetalle)
      setMensaje('❌ Error guardando detalle del pedido')
      return
    }

    setPedidoConfirmado(true)
    setUltimoPedidoGuardado({
      id: pedido.id,
      created_at: pedido.created_at,
      observaciones,
      items: [...items],
    })
    setMensaje(`✅ Pedido confirmado. ID: ${pedido.id}`)

    await cargarHistorial()
  }

  const exportarUltimoPedidoExcel = () => {
    if (!ultimoPedidoGuardado || !perfil) {
      setMensaje('❌ No hay pedido confirmado para exportar')
      return
    }

    const filas = ultimoPedidoGuardado.items.map((item) => ({
      pedido_id: ultimoPedidoGuardado.id,
      fecha: new Date(ultimoPedidoGuardado.created_at).toLocaleString(),
      sucursal: perfil.sucursales.nombre,
      usuario: perfil.usuario,
      codigo: item.codigo,
      articulo: item.articulo,
      cantidad: item.cantidad,
      observaciones: ultimoPedidoGuardado.observaciones || '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(filas)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos')

    XLSX.writeFile(workbook, `Pedido_${ultimoPedidoGuardado.id}.xlsx`)
    setMensaje('✅ Excel del pedido exportado correctamente')
  }

  const enviarUltimoPedidoWhatsApp = () => {
    if (!ultimoPedidoGuardado || !perfil) {
      setMensaje('❌ No hay pedido confirmado para enviar')
      return
    }

    const texto = [
      `PEDIDO CONFIRMADO - ${perfil.sucursales.nombre}`,
      `Pedido ID: ${ultimoPedidoGuardado.id}`,
      `Usuario: ${perfil.usuario}`,
      '',
      'DETALLE:',
      ...ultimoPedidoGuardado.items.map(
        (item) => `${item.codigo} - ${item.articulo} - Cantidad: ${item.cantidad}`
      ),
      '',
      `Observaciones: ${ultimoPedidoGuardado.observaciones || '-'}`,
    ].join('\n')

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
    setMensaje('✅ WhatsApp abierto con el pedido confirmado')
  }

  useEffect(() => {
    const iniciar = async () => {
      const perfilCargado = await cargarPerfil()
      if (perfilCargado) {
        await cargarProductos()
        await cargarHistorial()
      }
    }

    iniciar()
  }, [])

  const botonesRapidos = getBotonesRapidos()

  if (!usuario || !perfil) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Login de pedidos</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Clave"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          <button onClick={login} style={styles.button}>
            Ingresar
          </button>
          <p style={styles.message}>{mensaje}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.infoBox}>
        <h1 style={styles.title}>Toma de pedidos</h1>
        <p><strong>Email:</strong> {usuario.email}</p>
        <p><strong>Usuario:</strong> {perfil.usuario}</p>
        <p><strong>Sucursal:</strong> {perfil.sucursales.nombre}</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.subtitle}>Nuevo pedido</h2>

        <select
          ref={productoRef}
          value={productoSeleccionado}
          onChange={(e) => onSeleccionProducto(e.target.value)}
          style={styles.input}
          disabled={pedidoConfirmado}
        >
          <option value="">Seleccionar producto</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} - {p.nombre}
            </option>
          ))}
        </select>

        <input
          ref={cantidadRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={styles.input}
          disabled={pedidoConfirmado}
        />

        {botonesRapidos.length > 0 && (
          <div style={styles.quickButtonsWrap}>
            {botonesRapidos.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setCantidad(String(valor))}
                style={styles.buttonSmall}
                disabled={pedidoConfirmado}
              >
                {valor}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={agregarOActualizarItem}
          style={styles.buttonSecondary}
          disabled={pedidoConfirmado}
        >
          {editandoIndex !== null ? 'Actualizar item' : 'Agregar item'}
        </button>

        <textarea
          placeholder="Observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          style={styles.textarea}
          disabled={pedidoConfirmado}
        />

        <h3>Detalle del pedido actual</h3>

        {items.length === 0 ? (
          <p>No hay items cargados</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thtd}>Código</th>
                  <th style={styles.thtd}>Artículo</th>
                  <th style={styles.thtd}>Cantidad</th>
                  <th style={styles.thtd}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={styles.thtd}>{item.codigo}</td>
                    <td style={styles.thtd}>{item.articulo}</td>
                    <td style={styles.thtd}>{item.cantidad}</td>
                    <td style={styles.thtd}>
                      <button
                        onClick={() => editarItem(index)}
                        style={styles.buttonSmall}
                        disabled={pedidoConfirmado}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarItem(index)}
                        style={styles.buttonDanger}
                        disabled={pedidoConfirmado}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!pedidoConfirmado ? (
          <button onClick={confirmarPedido} style={styles.button}>
            Confirmar pedido
          </button>
        ) : (
          <>
            <button onClick={exportarUltimoPedidoExcel} style={styles.buttonSecondary}>
              Exportar Excel del pedido
            </button>

            <button onClick={enviarUltimoPedidoWhatsApp} style={styles.buttonSecondary}>
              Enviar pedido por WhatsApp
            </button>

            <button onClick={limpiarPedidoActual} style={styles.button}>
              Nuevo pedido
            </button>
          </>
        )}

        <button onClick={logout} style={styles.buttonSecondary}>
          Cerrar sesión
        </button>

        <p style={styles.message}>{mensaje}</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.subtitle}>Historial de pedidos</h2>

        {historial.length === 0 ? (
          <p>No hay pedidos guardados</p>
        ) : (
          historial.map((pedido) => (
            <div
              key={pedido.id}
              style={{
                border: '1px solid #d9d9d9',
                padding: 12,
                marginBottom: 16,
                borderRadius: 10,
              }}
            >
              <p><strong>Pedido ID:</strong> {pedido.id}</p>
              <p><strong>Fecha:</strong> {new Date(pedido.created_at).toLocaleString()}</p>
              <p><strong>Observaciones:</strong> {pedido.observaciones || '-'}</p>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.thtd}>Código</th>
                      <th style={styles.thtd}>Artículo</th>
                      <th style={styles.thtd}>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.pedido_detalle?.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.thtd}>{item.codigo}</td>
                        <td style={styles.thtd}>{item.articulo}</td>
                        <td style={styles.thtd}>{item.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default App