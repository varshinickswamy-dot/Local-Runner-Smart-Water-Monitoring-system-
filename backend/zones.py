# =========================================================
# JALRAKSHAK AI - WATER NETWORK ZONES
# =========================================================
#
# Static description of the monitored water network used by
# the live zone map. Each zone has one ESP32 monitoring device.
# Coordinates are approximate locations in Bengaluru.
# =========================================================


RESERVOIR = {
    "id": "RESERVOIR-01",
    "name_en": "Central Reservoir",
    "name_kn": "ಕೇಂದ್ರ ಜಲಾಶಯ",
    "lat": 12.9580,
    "lng": 77.6120,
}


ZONES = [
    {
        "zone_id": "ZONE-01",
        "device_id": "JAL-ESP32-001",
        "name_en": "Malleshwaram",
        "name_kn": "ಮಲ್ಲೇಶ್ವರಂ",
        "lat": 13.0035,
        "lng": 77.5700,
        "households": 4200,
    },
    {
        "zone_id": "ZONE-02",
        "device_id": "JAL-ESP32-002",
        "name_en": "Jayanagar",
        "name_kn": "ಜಯನಗರ",
        "lat": 12.9250,
        "lng": 77.5938,
        "households": 5100,
    },
    {
        "zone_id": "ZONE-03",
        "device_id": "JAL-ESP32-003",
        "name_en": "Indiranagar",
        "name_kn": "ಇಂದಿರಾನಗರ",
        "lat": 12.9784,
        "lng": 77.6408,
        "households": 3800,
    },
    {
        "zone_id": "ZONE-04",
        "device_id": "JAL-ESP32-004",
        "name_en": "Whitefield",
        "name_kn": "ವೈಟ್‌ಫೀಲ್ಡ್",
        "lat": 12.9698,
        "lng": 77.7500,
        "households": 6300,
    },
    {
        "zone_id": "ZONE-05",
        "device_id": "JAL-ESP32-005",
        "name_en": "Yelahanka",
        "name_kn": "ಯಲಹಂಕ",
        "lat": 13.1007,
        "lng": 77.5963,
        "households": 2900,
    },
    {
        "zone_id": "ZONE-06",
        "device_id": "JAL-ESP32-006",
        "name_en": "Electronic City",
        "name_kn": "ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ",
        "lat": 12.8452,
        "lng": 77.6602,
        "households": 4700,
    },
]


ZONES_BY_ID = {zone["zone_id"]: zone for zone in ZONES}
