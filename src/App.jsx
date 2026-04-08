import { useEffect, useState } from 'react'
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
    minWidth: 420,
    width: '100%',
  },
  thtd: {
    border: '1px solid #d9d9d9',
    padding: 8,
    textAlign: 'left',
    fontSize: 14,
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

    setProductos(data)
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

  const exportarExcel = () => {
    if (!historial.length || !perfil || !usuario) {
      setMensaje('❌ No hay historial para exportar')
      return
    }

    const filas = historial.flatMap((pedido) =>
      (pedido.pedido_detalle || []).map((item) => ({
        pedido_id: pedido.id,
        fecha: new Date(pedido.created_at).toLocaleString(),
        sucursal: perfil.sucursales.nombre,
        usuario: perfil.usuario,
        codigo: item.codigo,
        articulo: item.articulo,
        cantidad: item.cantidad,
        observaciones: pedido.observaciones || '',
      }))
    )

    const worksheet = XLSX.utils.json_to_sheet(filas)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos')

    XLSX.writeFile(workbook, `Pedidos_${perfil.sucursales.nombre}.xlsx`)
    setMensaje('✅ Excel exportado correctamente')
  }

  const enviarWhatsApp = () => {
    if (!perfil || items.length === 0) {
      setMensaje('❌ No hay pedido actual para enviar por WhatsApp')
      return
    }

    const texto = [
      `PEDIDO - ${perfil.sucursales.nombre}`,
      `Usuario: ${perfil.usuario}`,
      '',
      'DETALLE:',
      ...items.map((item) => `${item.codigo} - ${item.articulo} - Cantidad: ${item.cantidad}`),
      '',
      `Observaciones: ${observaciones || '-'}`,
    ].join('\n')

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
    setMensaje('✅ WhatsApp abierto con el pedido cargado')
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
    setMensaje('Sesión cerrada')
  }

  const agregarItem = () => {
    if (!productoSeleccionado || !cantidad || Number(cantidad) <= 0) {
      setMensaje('❌ Elegí producto y cantidad válida')
      return
    }

    const producto = productos.find((p) => String(p.id) === productoSeleccionado)

    if (!producto) {
      setMensaje('❌ Producto no encontrado')
      return
    }

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

    setProductoSeleccionado('')
    setCantidad('')
    setMensaje('Item agregado')
  }

  const guardarPedido = async () => {
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

    setMensaje(`✅ Pedido guardado correctamente. ID: ${pedido.id}`)
    setItems([])
    setObservaciones('')
    setProductoSeleccionado('')
    setCantidad('')

    await cargarHistorial()
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
          value={productoSeleccionado}
          onChange={(e) => setProductoSeleccionado(e.target.value)}
          style={styles.input}
        >
          <option value="">Seleccionar producto</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} - {p.nombre}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={styles.input}
        />

        <button onClick={agregarItem} style={styles.buttonSecondary}>
          Agregar item
        </button>

        <textarea
          placeholder="Observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          style={styles.textarea}
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
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={styles.thtd}>{item.codigo}</td>
                    <td style={styles.thtd}>{item.articulo}</td>
                    <td style={styles.thtd}>{item.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button onClick={guardarPedido} style={styles.button}>
          Confirmar pedido
        </button>

        <button onClick={enviarWhatsApp} style={styles.buttonSecondary}>
          Enviar por WhatsApp
        </button>

        <button onClick={exportarExcel} style={styles.buttonSecondary}>
          Exportar Excel
        </button>

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
