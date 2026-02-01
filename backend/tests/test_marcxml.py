import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app

MARCXML_SAMPLE = """
<record xmlns="http://www.loc.gov/MARC21/slim">
  <leader>01020nam a2200301 i 4500</leader>
  <controlfield tag="001">12345</controlfield>
  <controlfield tag="008">230101s2019    gw ||||| |||| 00| 0 eng d</controlfield>
  <datafield tag="100" ind1="1" ind2=" ">
    <subfield code="a">Doe, Jane</subfield>
  </datafield>
  <datafield tag="245" ind1="1" ind2="0">
    <subfield code="a">History of Vienna :</subfield>
    <subfield code="b">from 1800 to today</subfield>
  </datafield>
  <datafield tag="260" ind1=" " ind2=" ">
    <subfield code="c">2019</subfield>
  </datafield>
  <datafield tag="650" ind1=" " ind2="0">
    <subfield code="a">Vienna</subfield>
  </datafield>
  <datafield tag="650" ind1=" " ind2="0">
    <subfield code="a">History</subfield>
  </datafield>
</record>
"""


def _parse_record():
    record = ET.fromstring(MARCXML_SAMPLE)
    return app._parse_record(record)


def test_parse_record_basic_fields():
    data = _parse_record()
    assert data["id"] == "12345"
    assert data["title"] == "History of Vienna from 1800 to today"
    assert data["author"] == "Doe, Jane"
    assert data["year"] == 2019
    assert data["language"] == "eng"


def test_parse_record_subjects_unique():
    data = _parse_record()
    assert data["subjects"] == ["Vienna", "History"]


def test_extract_year_from_008_when_260_missing():
    xml = """
    <record xmlns="http://www.loc.gov/MARC21/slim">
      <controlfield tag="001">999</controlfield>
      <controlfield tag="008">230101s1995    ||||| |||| 00| 0 eng d</controlfield>
      <datafield tag="245" ind1="1" ind2="0">
        <subfield code="a">Test title</subfield>
      </datafield>
    </record>
    """
    record = ET.fromstring(xml)
    data = app._parse_record(record)
    assert data["year"] == 1995
