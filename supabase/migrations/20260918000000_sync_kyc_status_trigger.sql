-- Trigger: sync kyc_verifications.status → profiles.kyc_status
-- Fixes desync where approved verifications left profiles at 'not_started'

-- 1. Backfill existing approved verifications
UPDATE profiles p
SET kyc_status = kv.status
FROM kyc_verifications kv
WHERE kv.user_id = p.id
  AND kv.status = 'approved'
  AND p.kyc_status IS DISTINCT FROM 'approved';

-- 2. Create trigger function
CREATE OR REPLACE FUNCTION sync_kyc_status_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE profiles
    SET kyc_status = NEW.status
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger
DROP TRIGGER IF EXISTS trg_sync_kyc_status ON kyc_verifications;

CREATE TRIGGER trg_sync_kyc_status
  AFTER INSERT OR UPDATE ON kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION sync_kyc_status_to_profile();
