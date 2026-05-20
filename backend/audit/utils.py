from .models import AuditLog


def snapshot_target(target):
    if target is None:
        return {}
    data = {}
    meta = getattr(target, "_meta", None)
    if meta is None:
        return data
    for field in meta.fields:
        value = getattr(target, field.name, None)
        if field.is_relation:
            value = getattr(value, "pk", None)
        data[field.name] = str(value) if value is not None else None
    return data


def log_action(actor, action, target, details=""):
    AuditLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        target_type=target.__class__.__name__ if target is not None else "Unknown",
        target_id=str(getattr(target, "id", "")),
        details=details,
    )


def log_delete_action(actor, target, details=""):
    snapshot = snapshot_target(target)
    snapshot_text = ", ".join(f"{key}={value}" for key, value in snapshot.items())
    log_action(actor, "deleted", target, f"{details} | Deleted record snapshot: {snapshot_text}".strip())
