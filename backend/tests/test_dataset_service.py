import pytest
from datara.services.dataset_service import DatasetService

def test_normalize_category_key():
    assert DatasetService._normalize_category_key("Automotive") == "carautomation"
    assert DatasetService._normalize_category_key("DataCenter") == "serverrack"
    assert DatasetService._normalize_category_key("Humanoid") == "dexterity"
    assert DatasetService._normalize_category_key("warehouse") == "warehouse"
    assert DatasetService._normalize_category_key("  Some--Weird_Category!!  ") == "someweirdcategory"
    assert DatasetService._normalize_category_key(None) == ""

def test_humanize_dataset_title():
    assert DatasetService._humanize_dataset_title("frontGrille") == "Front Grille"
    assert DatasetService._humanize_dataset_title("server_rack_01") == "Server rack 01"
    assert DatasetService._humanize_dataset_title("warehouse-nav") == "Warehouse nav"
    assert DatasetService._humanize_dataset_title("") == "Dataset"
    assert DatasetService._humanize_dataset_title(None) == "Dataset"

def test_clean_tag_list():
    assert DatasetService._clean_tag_list(["tag1", "tag2", "tag1"]) == ["tag1", "tag2"]
    assert DatasetService._clean_tag_list({"group1": ["tagA"], "group2": ["tagB", "tagA"]}) == ["tagA", "tagB"]
    assert DatasetService._clean_tag_list("single_tag") == ["single_tag"]
    assert DatasetService._clean_tag_list(None) == []
    assert DatasetService._clean_tag_list(["", "   ", "valid"]) == ["valid"]

def test_extract_numeric_frame_id():
    assert DatasetService._extract_numeric_frame_id("image_0045.jpg") == 45
    assert DatasetService._extract_numeric_frame_id("frame_01.png") == 1
    assert DatasetService._extract_numeric_frame_id("no_number.jpg") is None
    assert DatasetService._extract_numeric_frame_id("00123.jpg") == 123
