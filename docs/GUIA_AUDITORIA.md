# Guía de Integración Técnica: Ecosistema STGC

Esta guía está dirigida a desarrolladores que deseen integrar nuevos microservicios con el **Sistema de Trazabilidad y Gestión de Café (STGC)**. El servicio central de identidad (`auth-service`) provee los mecanismos de autenticación y auditoría para todo el ecosistema.

---

## 1. Identidad y Roles en la Finca

El sistema utiliza un modelo de **Control de Acceso Basado en Roles (RBAC)**. Al integrar un nuevo servicio, no es necesario consultar al `auth-service` para saber qué puede hacer un usuario; toda la información necesaria viaja dentro del **JWT (JSON Web Token)**.

### Jerarquía de Roles Sugerida para Integraciones
A continuación se presentan los roles actuales y ejemplos de qué acciones deberían permitirse en otros microservicios:

| Rol | Ámbito Sugerido | Ejemplo de Acción en Microservicio |
| :--- | :--- | :--- |
| `ADMIN` | Total | Acceso a configuraciones globales del ecosistema. |
| `GESTOR_INVENTARIO` | Inventario | Registrar entrada de sacos de café pergamino. |
| `GESTOR_CALIDAD` | Laboratorio | Registrar resultados de catación y puntaje SCAA. |
| `CONTROLADOR_DESPACHO` | Logística | Generar guías de remisión y órdenes de salida. |
| `TOSTADOR` | Procesamiento | Iniciar y finalizar botes de tostado. |
| `CAPATAZ` | Campo | Registrar asistencia del personal de recolección. |

---

## 2. Validación de Autorización (Descentralizada)

Para que tu microservicio valide quién es el usuario y qué puede hacer, debe verificar la firma del JWT utilizando la `SECRET_KEY` compartida.

### Campos Clave del Payload
- `sub`: UUID único del usuario (ID interno).
- `role`: Nombre del rol (ej: `GESTOR_INVENTARIO`).
- `session_token`: ID de sesión único (permite invalidación remota).

### Ejemplo: Protección de un Endpoint de Despacho (FastAPI)

```python
from fastapi import Depends, HTTPException
from jose import jwt

# En tu microservicio de Logística
def require_logistica(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    role = payload.get("role")
    
    # Validamos que sea el rol encargado o el administrador
    if role not in ["CONTROLADOR_DESPACHO", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Acceso reservado a Logística")
    return payload
```

---

## 3. Servicio de Auditoría Centralizada

Es **obligatorio** que cada acción que modifique datos (POST, PUT, PATCH, DELETE) sea reportada al `auth-service` para mantener un historial unificado de operaciones.

### Endpoint: `POST /api/internal/audit`

- **Seguridad**: Header `X-Internal-Api-Key`.
- **Modo**: Asíncrono (No bloquea tu servicio).

### Ejemplo de uso: Registro de un pesaje de café
Cuando un `TECNICO_DESPULPADO` registra un pesaje, el servicio de procesamiento debe enviar:

```json
{
  "user_id": "8f753e5a-6274-4972-b13d-4eae0314b7f6",
  "action": "REGISTRO_PESAJE_CAFÉ_CEREZA",
  "endpoint": "/api/procesamiento/pesaje",
  "ip_address": "10.0.0.45"
}
```

---

## 4. Checklist para Nuevos Microservicios

1.  **Variables de Entorno**: Configura `SECRET_KEY` e `INTERNAL_API_KEY`.
2.  **Middlewares**: Implementa la captura de la IP real del cliente para los logs.
3.  **Logs**: No guardes contraseñas ni datos sensibles en los logs locales; usa el servicio de auditoría para eventos de negocio.
4.  **Error Handling**: Devuelve códigos HTTP estándar (401 para falta de token, 403 para rol insuficiente).

---

*Para dudas adicionales, contacta al administrador del sistema o revisa la documentación de ReDoc en el endpoint `/docs`.*
