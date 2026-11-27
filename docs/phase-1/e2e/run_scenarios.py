#!/usr/bin/env python3
"""Chay T1-T14 tren stack E2E (gateway 9080, DB mems_e2e_*). In PASS/FAIL + luu evidence."""
import json
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
RES = HERE / "results"
EVID = RES / "t-scenarios"
EVID.mkdir(parents=True, exist_ok=True)
SEED = HERE / "seed-e2e.sql"

BASE = "http://127.0.0.1:9080"
PWD = "Sample@123456"

ORG1 = "eeeeeeee-0000-4000-8000-000000000001"
ORG2 = "eeeeeeee-0000-4000-8000-000000000002"
DEPT = "eeeeeeee-dddd-4ddd-8ddd-ddddddddddd1"
CA, CB, CC, CD, CE, CF, CG, CZ, CX, CO = (
    f"eeeeeeee-bbbb-4bbb-8bbb-0000000000{i:02d}" for i in range(1, 11))
R1, R2, R3, R4, R5, R6, R7 = (
    f"eeeeeeee-6666-4666-8666-00000000000{i}" for i in range(1, 8))
S_TOAN, S_VAN, S_LY, S_ANH, S_TIN, S_SU = (
    f"eeeeeeee-5555-4555-8555-00000000000{i}" for i in range(1, 7))
T1, T2, T3, T4 = (f"eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaa{i}" for i in (11, 12, 13, 14))
SEED_SESSIONS = [f"eeeeeeee-1234-4abc-9def-00000000000{i}" for i in range(1, 6)]


def env_val(key):
    for line in (ROOT / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("missing " + key)


DB_U, DB_P = env_val("DB_USERNAME"), env_val("DB_PASSWORD")
MYSQL = ["mysql", "-h127.0.0.1", "-u" + DB_U, "-p" + DB_P, "-N", "-B"]

results = []


def check(tag, name, cond, evidence):
    ok = bool(cond)
    results.append((tag, name, ok, str(evidence)))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {evidence}")


def sql(q):
    p = subprocess.run(MYSQL + ["-e", q], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if p.returncode:
        raise RuntimeError(p.stderr.strip())
    return [ln.split("\t") for ln in p.stdout.splitlines() if ln != ""]


def one(q):
    rows = sql(q)
    return rows[0][0] if rows else None


def api(method, path, token=None, body=None, timeout=180):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, (json.loads(raw) if raw else None)
        except Exception:
            return e.code, raw.decode("utf-8", "replace")


def login(user):
    st, body = api("POST", "/api/v1/auth/login", None, {"username": user, "password": PWD})
    if st != 200:
        raise RuntimeError(f"login {user} -> {st} {body}")
    return body["accessToken"]


def save(name, obj):
    (EVID / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def draft(tok, class_ids, date_from, date_to, save_name=None):
    st, body = api("POST", f"/api/departments/{DEPT}/schedules/drafts", tok,
                   {"classIds": class_ids, "dateFrom": date_from, "dateTo": date_to})
    if save_name and isinstance(body, (dict, list)):
        save(save_name, body)
    return st, body


def items_of(tok, d):
    out = []
    for week in range(1, d["totalWeeks"] + 1):
        st, detail = api("GET", f"/api/departments/{DEPT}/schedules/drafts/{d['id']}?week={week}", tok)
        if st != 200:
            raise RuntimeError(f"detail week {week} -> {st} {detail}")
        out.extend(detail["items"])
    return out


def reset_baseline():
    ids = ",".join(f"'{i}'" for i in SEED_SESSIONS)
    sql("DELETE FROM mems_e2e_schedule_db.schedule_draft_item")
    sql("DELETE FROM mems_e2e_schedule_db.schedule_draft_unscheduled")
    sql("DELETE FROM mems_e2e_schedule_db.schedule_draft")
    sql(f"DELETE FROM mems_e2e_schedule_db.session WHERE id NOT IN ({ids})")


def conflicts(items):
    bad = []
    for i, a in enumerate(items):
        for b in items[i + 1:]:
            if not (a["startTime"] < b["endTime"] and b["startTime"] < a["endTime"]):
                continue
            for key, label in (("classId", "class"), ("teacherId", "teacher"), ("roomId", "room")):
                if a.get(key) and a[key] == b.get(key):
                    bad.append(f"{label}:{a[key]} {a['startTime']}")
    return bad


def t1(tok):
    seed_sql = SEED.read_text(encoding="utf-8")
    p = subprocess.run(["mysql", "-h127.0.0.1", "-u" + DB_U, "-p" + DB_P],
                       input=seed_sql.encode("utf-8"), capture_output=True)
    check("T1", "seed chay khong loi", p.returncode == 0,
          f"exit={p.returncode} stderr={p.stderr.decode('utf-8', 'replace').strip()[:200]}")
    expected = {"identity.org": 2, "identity.account": 7, "people.teacher": 4, "people.student": 95,
                "people.class": 10, "people.class_subject": 12, "people.class_student": 95,
                "facility.classroom": 7, "schedule.time_slot": 6, "schedule.session": 5}
    got = {}
    for row in sql("""
        SELECT 'identity.org', COUNT(*) FROM mems_e2e_identity_db.organization WHERE id LIKE 'eeeeeeee-0000-4000-8000-%'
        UNION ALL SELECT 'identity.account', COUNT(*) FROM mems_e2e_identity_db.account WHERE username LIKE 'e2e\\_%'
        UNION ALL SELECT 'people.teacher', COUNT(*) FROM mems_e2e_people_db.teacher_profile WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
        UNION ALL SELECT 'people.student', COUNT(*) FROM mems_e2e_people_db.student WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
        UNION ALL SELECT 'people.class', COUNT(*) FROM mems_e2e_people_db.school_class WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
        UNION ALL SELECT 'people.class_subject', COUNT(*) FROM mems_e2e_people_db.class_subject WHERE class_id LIKE 'eeeeeeee-bbbb-4bbb-8bbb-%'
        UNION ALL SELECT 'people.class_student', COUNT(*) FROM mems_e2e_people_db.class_student WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
        UNION ALL SELECT 'facility.classroom', COUNT(*) FROM mems_e2e_facility_db.classroom WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
        UNION ALL SELECT 'schedule.time_slot', COUNT(*) FROM mems_e2e_schedule_db.time_slot WHERE org_id='eeeeeeee-0000-4000-8000-000000000001'
        UNION ALL SELECT 'schedule.session', COUNT(*) FROM mems_e2e_schedule_db.session WHERE class_id LIKE 'eeeeeeee-bbbb-4bbb-8bbb-%'
        """):
        got[row[0]] = int(row[1])
    save("t01-seed-counts.json", got)
    check("T1", "so luong du lieu seed dung", got == expected, f"got={got}")


def t2(tok):
    st, d = draft(tok, [CA], "2026-11-30", "2026-12-13", "t02-draft-10A.json")
    ok = st == 201 and d["totalItems"] == 6 and d["unscheduledCount"] == 0 and d["exceptionCount"] == 0
    check("T2", "nhap 10A du 6 buoi, khong loi", ok,
          f"status={st} items={d.get('totalItems')} unsched={d.get('unscheduledCount')} exc={d.get('exceptionCount')}")
    items = items_of(tok, d)
    bad = conflicts(items)
    check("T2", "khong xung dot trong nhap", not bad, f"conflicts={bad}")
    per = {}
    for it in items:
        per[it["subjectName"]] = per.get(it["subjectName"], 0) + 1
    check("T2", "3 mon x 2 tuan", per == {"Toan": 2, "Van": 2, "Ly": 2}, f"per_subject={per}")
    return d


def t4(tok):
    st, d = draft(tok, [CB], "2026-11-30", "2026-12-13", "t04-draft-10B.json")
    check("T4", "10B: mon co GV van xep, mon thieu GV bao ly do", st == 201
          and d["totalItems"] == 2 and d["unscheduledCount"] == 1,
          f"status={st} items={d.get('totalItems')} unsched={d.get('unscheduledCount')}")
    items = items_of(tok, d)
    check("T4", "2 buoi Toan cua GV1", all(i["subjectName"] == "Toan" and i["teacherId"] == T1 for i in items),
          f"items={[(i['subjectName'], i['teacherId']) for i in items]}")
    u = d["unscheduled"][0] if d["unscheduled"] else {}
    check("T4", "ly do dung: khong co GV du dieu kien mon Anh",
          u.get("subjectId") == S_ANH and "giáo viên đủ điều kiện" in (u.get("reason") or ""),
          f"reason={u.get('reason')}")


def t5(tok):
    sql("UPDATE mems_e2e_facility_db.classroom SET status='maintenance' WHERE id IN "
        f"('{R6}','{R7}')")
    try:
        st, d = draft(tok, [CF], "2026-12-04", "2026-12-17", "t05-draft-10F.json")
    finally:
        sql("UPDATE mems_e2e_facility_db.classroom SET status='active' WHERE id IN "
            f"('{R6}','{R7}')")
    u = d["unscheduled"][0] if d["unscheduled"] else {}
    check("T5", "phong may bao tri -> mon Tin khong xep duoc", st == 201
          and d["totalItems"] == 0 and d["unscheduledCount"] == 1,
          f"status={st} items={d.get('totalItems')} unsched={d.get('unscheduledCount')}")
    check("T5", "ly do dung: khong co phong may du 30 cho",
          "phòng máy" in (u.get("reason") or "") and "30" in (u.get("reason") or ""),
          f"reason={u.get('reason')}")


def t11(tok):
    st, d = draft(tok, [CG, CZ], "2026-12-14", "2026-12-28", "t11-draft-10G-10Z.json")
    items = items_of(tok, d) if st == 201 else []
    exc = [i for i in items if i["exception"]]
    per = {}
    for it in items:
        per[it["classId"]] = per.get(it["classId"], 0) + 1
    check("T11", "1 ngoai le duy nhat trong nhap 10G+10Z", st == 201
          and d["totalItems"] == 6 and d["exceptionCount"] == 1 and len(exc) == 1,
          f"status={st} items={d.get('totalItems')} exc={d.get('exceptionCount')} exc_items={len(exc)}")
    check("T11", "10G du 5 buoi, 10Z 1 buoi", per.get(CG) == 5 and per.get(CZ) == 1, f"per_class={per}")
    if exc:
        e = exc[0]
        check("T11", "buoi ngoai le co loai + ly do", bool(e["exceptionType"]) and bool(e["exceptionReason"]),
              f"class={e['classId']} type={e['exceptionType']} room={e['roomCode']} reason={e['exceptionReason']}")


def t13b(tok):
    st, d = draft(tok, [CC], "2026-11-30", "2026-12-06", "t13b-draft-10C.json")
    items = items_of(tok, d) if st == 201 else []
    room = items[0]["roomCode"] if items else None
    check("T13b", "phong thuong con trong -> khong dung phong may", st == 201
          and len(items) == 1 and room not in ("R6", "R7") and d["exceptionCount"] == 0,
          f"status={st} room={room} exc={d.get('exceptionCount')}")


def t13a(tok):
    st, d = draft(tok, [CE], "2026-12-03", "2026-12-03", "t13a-draft-10E.json")
    items = items_of(tok, d) if st == 201 else []
    room = items[0]["roomCode"] if items else None
    check("T13a", "phong thuong kin -> dung phong may", st == 201
          and len(items) == 1 and room in ("R6", "R7"),
          f"status={st} items={len(items)} room={room}")


def t14(tok):
    st, d = draft(tok, [CD], "2026-11-30", "2026-12-13", "t14-draft-10D.json")
    check("T14", "lop du buoi ke hoach -> khong sinh yeu cau", st == 201
          and d["totalItems"] == 0 and d["unscheduledCount"] == 0,
          f"status={st} items={d.get('totalItems')} unsched={d.get('unscheduledCount')}")


def t3(tok, owner, d_a):
    st, conf = api("POST", f"/api/departments/{DEPT}/schedules/drafts/{d_a['id']}/confirm", owner)
    save("t03-confirm-10A.json", {"status": st, "body": conf})
    check("T3", "xac nhan nhap 10A tao 6 buoi", st == 200 and conf["created"] == 6 and not conf["failed"],
          f"status={st} created={conf.get('created')} failed={conf.get('failed')}")
    n = int(one(f"SELECT COUNT(*) FROM mems_e2e_schedule_db.session WHERE class_id='{CA}' "
                "AND deleted_at IS NULL AND status<>'cancelled'"))
    check("T3", "DB co dung 6 buoi cua 10A", n == 6, f"sessions={n}")

    st, lst = api("GET", f"/api/departments/{DEPT}/schedules?classId={CA}", owner)
    save("t03-list-10A.json", {"status": st, "body": lst})
    check("T3", "man hinh lich (list theo lop) tra 6 buoi", st == 200 and len(lst) == 6,
          f"status={st} rows={len(lst) if isinstance(lst, list) else '?'}")

    tt = login("e2e_teacher1")
    st, mine = api("GET", "/api/schedules/me", tt)
    save("t03-me-teacher1.json", {"status": st, "body": mine})
    own = [s for s in mine if s.get("teacherId") == T1] if isinstance(mine, list) else []
    check("T3", "GV1 thay 2 buoi cua minh (/schedules/me)", st == 200 and len(own) == 2,
          f"status={st} teacher_rows={len(own)}")

    ts = login("e2e_student")
    st, mine = api("GET", "/api/schedules/me", ts)
    save("t03-me-student.json", {"status": st, "body": mine})
    check("T3", "HS 10A thay 6 buoi cua lop (/schedules/me)", st == 200
          and isinstance(mine, list) and len(mine) == 6,
          f"status={st} student_rows={len(mine) if isinstance(mine, list) else '?'}")

    first = sql(f"SELECT DATE_FORMAT(start_time,'%Y-%m-%d %H:%i:%s') FROM mems_e2e_schedule_db.session "
                f"WHERE class_id='{CA}' ORDER BY start_time LIMIT 1")
    db_time = first[0][0] if first else None
    api_first = min((s["startTime"] for s in lst), default=None) if isinstance(lst, list) else None
    save("t10-time.json", {"db_local": db_time, "api_utc": api_first})
    check("T10", "07:30 gio VN (DB local 07:30, API tra 00:30Z)", db_time == "2026-11-30 07:30:00"
          and api_first == "2026-11-30T00:30:00Z", f"db={db_time} api={api_first}")


def t6(tok):
    st, d = draft(tok, [CX], "2026-12-09", "2026-12-09", "t06-draft-10X.json")
    items = items_of(tok, d) if st == 201 else []
    if not items:
        check("T6", "tao duoc nhap 10X", False, f"status={st} items=0")
        return
    it = items[0]
    st2, created = api("POST", f"/api/departments/{DEPT}/schedules", tok, {
        "classId": CO, "teacherId": it["teacherId"], "teacherName": it["teacherName"],
        "roomId": R1, "subjectName": "Su",
        "startTime": it["startTime"], "endTime": it["endTime"]})
    save("t06-create-realsession.json", {"status": st2, "body": created, "draft_item": it})
    check("T6", "tao buoi that trung gio voi nhap", st2 in (200, 201), f"status={st2}")
    st3, conf = api("POST", f"/api/departments/{DEPT}/schedules/drafts/{d['id']}/confirm", tok)
    save("t06-confirm-conflict.json", {"status": st3, "body": conf})
    check("T6", "xac nhan bao xung dot, khong ghi trung", st3 == 409 and conf["created"] == 0
          and len(conf["failed"]) > 0,
          f"status={st3} created={conf.get('created')} failed={conf.get('failed')}")
    n = int(one(f"SELECT COUNT(*) FROM mems_e2e_schedule_db.session WHERE class_id='{CX}'"))
    check("T6", "10X khong bi ghi buoi nao", n == 0, f"sessions={n}")


def t12(tok):
    st, d = draft(tok, [CC], "2026-11-30", "2026-12-06", "t12-draft-10C.json")
    items = items_of(tok, d) if st == 201 else []
    if not items:
        check("T12", "tao duoc nhap 10C", False, f"status={st} items=0")
        return
    it = items[0]
    st2, patched = api("PATCH", f"/api/departments/{DEPT}/schedules/drafts/{d['id']}/items/{it['id']}",
                       tok, {"roomId": R5, "startTime": "2026-12-02T03:55:00Z",
                             "endTime": "2026-12-02T05:25:00Z", "teacherId": T4})
    save("t12-patch-item.json", {"status": st2, "body": patched})
    check("T12", "sua tay buoi nhap sang Thu 4 tiet 5-6 phong R5", st2 == 200
          and patched["manualEdit"] and patched["roomCode"] == "R5"
          and patched["startTime"] == "2026-12-02T03:55:00Z",
          f"status={st2} room={patched.get('roomCode')} start={patched.get('startTime')} manual={patched.get('manualEdit')}")
    st3, conf = api("POST", f"/api/departments/{DEPT}/schedules/drafts/{d['id']}/confirm", tok)
    save("t12-confirm-10C.json", {"status": st3, "body": conf})
    check("T12", "xac nhan luu dung buoi da sua", st3 == 200 and conf["created"] == 1,
          f"status={st3} created={conf.get('created')} failed={conf.get('failed')}")
    row = sql(f"SELECT teacher_id, room_id, DATE_FORMAT(start_time,'%Y-%m-%d %H:%i:%s') "
              f"FROM mems_e2e_schedule_db.session WHERE class_id='{CC}'")
    got = row[0] if row else None
    check("T12", "DB dung GV4, phong R5, 10:55 gio VN", got == [T4, R5, "2026-12-02 10:55:00"], f"row={got}")


def t7(tok):
    # SCHEDULE_MANAGEMENT là module lõi (is_core=1) nên organization_module.status bị bỏ qua.
    # Hạ tạm is_core=0 trong catalog E2E để đi vào nhánh read-only của guard, rồi khôi phục.
    sql("UPDATE mems_e2e_identity_db.module SET is_core=0 WHERE code='SCHEDULE_MANAGEMENT'")
    sql("UPDATE mems_e2e_identity_db.organization_module SET status='disabled' "
        f"WHERE org_id='{ORG1}' AND module_code='SCHEDULE_MANAGEMENT'")
    try:
        st, body = draft(tok, [CB], "2026-11-30", "2026-12-13", "t07-draft-blocked.json")
        check("T7", "module disabled -> ghi bi chan 400 MODULE_NOT_ENABLED", st == 400
              and isinstance(body, dict) and body.get("code") == "MODULE_NOT_ENABLED",
              f"status={st} code={body.get('code') if isinstance(body, dict) else body}")
        st2, lst = api("GET", f"/api/departments/{DEPT}/schedules/drafts", tok)
        check("T7", "module disabled -> doc van duoc", st2 == 200 and isinstance(lst, list),
              f"status={st2} drafts={len(lst) if isinstance(lst, list) else '?'}")
    finally:
        sql("UPDATE mems_e2e_identity_db.organization_module SET status='active' "
            f"WHERE org_id='{ORG1}' AND module_code='SCHEDULE_MANAGEMENT'")
        sql("UPDATE mems_e2e_identity_db.module SET is_core=1 WHERE code='SCHEDULE_MANAGEMENT'")
    st3, d = draft(tok, [CB], "2026-11-30", "2026-12-13")
    check("T7", "bat lai active -> ghi duoc", st3 == 201, f"status={st3}")


def t8():
    tt = login("e2e_teacher1")
    st, body = api("GET", f"/api/departments/{DEPT}/schedules/drafts", tt)
    save("t08-teacher-403.json", {"status": st, "body": body})
    check("T8", "GV khong co quyen -> 403", st == 403 and isinstance(body, dict)
          and body.get("code") == "FORBIDDEN", f"status={st} code={body.get('code') if isinstance(body, dict) else body}")


def t9(tok2):
    st, lst = api("GET", f"/api/departments/{DEPT}/schedules/drafts", tok2)
    save("t09-org2-list.json", {"status": st, "body": lst})
    check("T9", "org2 khong thay nhap cua org1", st == 200 and lst == [], f"status={st} rows={lst}")
    st2, d = draft(tok2, [CA], "2026-11-30", "2026-12-13", "t09-org2-draft.json")
    u = d["unscheduled"][0] if isinstance(d, dict) and d.get("unscheduled") else {}
    check("T9", "org2 dung id lop org1 -> khong co du lieu lop", st2 == 201
          and d["totalItems"] == 0 and d["unscheduledCount"] == 1
          and "không tồn tại" in (u.get("reason") or ""),
          f"status={st2} items={d.get('totalItems')} unsched={d.get('unscheduledCount')} reason={u.get('reason')}")
    st3, lst2 = api("GET", f"/api/departments/{DEPT}/schedules", tok2)
    check("T9", "org2 xem lich phong ban org1 -> rong", st3 == 200 and lst2 == [],
          f"status={st3} rows={lst2}")


def run(tag, fn, *args):
    print(f"== {tag}")
    try:
        return fn(*args)
    except Exception as exc:  # noqa: BLE001 - scenario runner must continue
        check(tag, "loi khi chay", False, repr(exc))
        return None


def main():
    print("Reset E2E schedule ve baseline seed...")
    reset_baseline()
    owner = login("e2e_owner")
    run("T1", t1, owner)
    owner = login("e2e_owner")
    run("T2", t2, owner)
    run("T4", t4, owner)
    run("T5", t5, owner)
    run("T11", t11, owner)
    run("T13b", t13b, owner)
    run("T13a", t13a, owner)
    run("T14", t14, owner)
    owner = login("e2e_owner")
    st, d_a = draft(owner, [CA], "2026-11-30", "2026-12-13")
    if st != 201:
        check("T3", "tao nhap 10A de xac nhan", False, f"status={st}")
    else:
        run("T3", t3, owner, owner, d_a)
    owner = login("e2e_owner")
    run("T6", t6, owner)
    run("T12", t12, owner)
    run("T7", t7, owner)
    run("T8", t8)
    owner2 = login("e2e_owner2")
    run("T9", t9, owner2)

    passed = sum(1 for _, _, ok, _ in results if ok)
    total = len(results)
    print(f"\nTONG: {passed}/{total} check PASS")
    (RES / "scenario-summary.json").write_text(json.dumps(
        [{"tag": t, "check": n, "pass": ok, "evidence": ev} for t, n, ok, ev in results],
        ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
