# Authorization Model (RBAC)

## Roles & Permissions Taxonomy

AuthForge implements strict Role-Based Access Control mapped to atomic permissions:

```
[User] ──(assigned)──> [Role] ──(has many)──> [RolePermission] ──> [Permission]
```

### Taxonomy Table

| Permission | Description | SuperAdmin | Admin | Developer | User |
|---|---|:---:|:---:|:---:|:---:|
| `USER_READ` | View user profiles & list users | ✅ | ✅ | ❌ | ❌ |
| `USER_UPDATE` | Update user roles & status | ✅ | ✅ | ❌ | ❌ |
| `USER_DELETE` | Delete user records | ✅ | ❌ | ❌ | ❌ |
| `PROJECT_READ` | Read project resources | ✅ | ✅ | ✅ | ✅ |
| `PROJECT_WRITE` | Create/edit project resources | ✅ | ✅ | ✅ | ❌ |
| `AUDIT_READ` | View security audit trail | ✅ | ✅ | ❌ | ❌ |
| `API_MANAGE` | Create & revoke API Keys | ✅ | ✅ | ✅ | ❌ |
| `GATEWAY_MANAGE` | Configure Gateway routes | ✅ | ❌ | ❌ | ❌ |
| `ROLE_MANAGE` | Modify platform roles | ✅ | ❌ | ❌ | ❌ |

---

## Decoupled Guards

Authorization logic is decoupled from controllers usingExpress middleware guards:

```typescript
// Permission Guard Example
router.get('/audit-logs', requirePermission('AUDIT_READ'), auditController.getLogs);

// Role Guard Example
router.patch('/users/:id/role', requireRole('SuperAdmin', 'Admin'), userController.updateUserRole);
```
