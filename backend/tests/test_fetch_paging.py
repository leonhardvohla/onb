import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app


class _FakeResponse:
    def __init__(self, text):
        self.text = text

    def raise_for_status(self):
        return None


def _build_sru_xml(total, start_record, count, include_next=True):
    records = []
    for idx in range(count):
        record_id = start_record + idx
        records.append(
            f"""
            <srw:record>
              <srw:recordData>
                <marc:record>
                  <marc:controlfield tag="001">{record_id}</marc:controlfield>
                  <marc:datafield tag="245" ind1="1" ind2="0">
                    <marc:subfield code="a">Title {record_id}</marc:subfield>
                  </marc:datafield>
                </marc:record>
              </srw:recordData>
            </srw:record>
            """
        )
    next_pos = start_record + count
    next_xml = (
        f"<srw:nextRecordPosition>{next_pos}</srw:nextRecordPosition>"
        if include_next and next_pos <= total and count > 0
        else ""
    )
    return f"""
    <srw:searchRetrieveResponse
      xmlns:srw="http://www.loc.gov/zing/srw/"
      xmlns:marc="http://www.loc.gov/MARC21/slim">
      <srw:numberOfRecords>{total}</srw:numberOfRecords>
      {next_xml}
      <srw:records>
        {''.join(records)}
      </srw:records>
    </srw:searchRetrieveResponse>
    """


def test_fetch_sru_records_batches_past_50(monkeypatch):
    calls = []
    total = 120

    def fake_get(url, params, timeout):
        del url, timeout
        calls.append((params["startRecord"], params["maximumRecords"]))
        start = int(params["startRecord"])
        requested = int(params["maximumRecords"])
        available = max(0, total - start + 1)
        count = min(requested, available)
        return _FakeResponse(_build_sru_xml(total, start, count, include_next=True))

    monkeypatch.setattr(app.requests, "get", fake_get)

    records, total_found, error = app._fetch_sru_records("Rilke", "author", 120, 1)

    assert error == ""
    assert total_found == 120
    assert len(records) == 120
    assert calls == [(1, 50), (51, 50), (101, 20)]


def test_fetch_sru_records_respects_start_record(monkeypatch):
    calls = []
    total = 2095

    def fake_get(url, params, timeout):
        del url, timeout
        calls.append((params["startRecord"], params["maximumRecords"]))
        start = int(params["startRecord"])
        requested = int(params["maximumRecords"])
        available = max(0, total - start + 1)
        count = min(requested, available)
        return _FakeResponse(_build_sru_xml(total, start, count, include_next=True))

    monkeypatch.setattr(app.requests, "get", fake_get)

    records, total_found, error = app._fetch_sru_records("Rilke", "author", 80, 501)

    assert error == ""
    assert total_found == 2095
    assert len(records) == 80
    assert calls == [(501, 50), (551, 30)]


def test_fetch_sru_records_stops_when_sru_returns_fewer_records(monkeypatch):
    calls = []
    total = 20

    def fake_get(url, params, timeout):
        del url, timeout
        calls.append((params["startRecord"], params["maximumRecords"]))
        start = int(params["startRecord"])
        requested = int(params["maximumRecords"])
        available = max(0, total - start + 1)
        count = min(requested, available)
        return _FakeResponse(_build_sru_xml(total, start, count, include_next=False))

    monkeypatch.setattr(app.requests, "get", fake_get)

    records, total_found, error = app._fetch_sru_records("Rilke", "author", 100, 1)

    assert error == ""
    assert total_found == 20
    assert len(records) == 20
    assert calls == [(1, 50)]
