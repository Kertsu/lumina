-- Rebuild derived search data with canonical normalization. Compatibility
-- normalization used by the prototype checkpoint collapsed literal Unicode
-- whitespace. Startup rebuilds missing rows in this same migration transaction.
DELETE FROM verse_search;
