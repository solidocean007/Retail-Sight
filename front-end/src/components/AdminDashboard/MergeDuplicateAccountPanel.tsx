import { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { httpsCallable } from "firebase/functions";
import { useSelector } from "react-redux";
import { functions } from "../../utils/firebase";
import { selectUser } from "../../Slices/userSlice";

const ALLOWED_ROLES = new Set(["admin", "super-admin", "developer"]);

/**
 * Fixes the "existing employee signed in with a new email and got a second,
 * disconnected account" problem (Google sign-in auto-provisions on first
 * use of any email — see LoginForm.tsx). Backed by the
 * mergeDuplicateUserAccount callable, which moves the new email onto the
 * original account and removes the stray one without touching post history.
 */
const MergeDuplicateAccountPanel = () => {
  const currentUser = useSelector(selectUser);
  const [originalEmail, setOriginalEmail] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when the backend couldn't find a duplicate Auth account and is
  // asking us to confirm that's expected (e.g. it was already deleted by
  // hand) before it attaches the email to the original account anyway.
  const [needsNoDuplicateConfirm, setNeedsNoDuplicateConfirm] =
    useState(false);

  if (!currentUser?.role || !ALLOWED_ROLES.has(currentUser.role)) {
    return null;
  }

  const runMerge = async (confirmNoExistingDuplicate: boolean) => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const mergeDuplicateUserAccount = httpsCallable(
        functions,
        "mergeDuplicateUserAccount",
      );
      const res = await mergeDuplicateUserAccount({
        originalEmail: originalEmail.trim().toLowerCase(),
        duplicateEmail: duplicateEmail.trim().toLowerCase(),
        confirmNoExistingDuplicate,
      });
      const data = res.data as { note?: string };
      setResult(
        data.note || "Merged. The user should now sign in with the new email.",
      );
      setNeedsNoDuplicateConfirm(false);
      setOriginalEmail("");
      setDuplicateEmail("");
    } catch (err: any) {
      if (err?.details?.requiresConfirmation) {
        setNeedsNoDuplicateConfirm(true);
        setError(err.message || "No account found for that email.");
      } else {
        setNeedsNoDuplicateConfirm(false);
        setError(err?.message || "Merge failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMerge = () => {
    setNeedsNoDuplicateConfirm(false);
    runMerge(false);
  };

  const handleConfirmNoDuplicate = () => runMerge(true);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">
          Fix a duplicate account (new email, same person)
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Use this when someone with an existing Displaygram account signs
          in with a new email (often Google) and it creates a second,
          disconnected account instead of recognizing them. This moves the
          new email onto their original account and removes the stray one —
          it does not touch their post history. It refuses to run if the
          "duplicate" already belongs to a company, since that means it
          isn't actually a duplicate.
        </Typography>

        <Stack direction="column" spacing={2} sx={{ maxWidth: 420 }}>
          <TextField
            label="Original email (has the history)"
            size="small"
            value={originalEmail}
            onChange={(e) => setOriginalEmail(e.target.value)}
          />
          <TextField
            label="New / duplicate email (the stray account)"
            size="small"
            value={duplicateEmail}
            onChange={(e) => {
              setDuplicateEmail(e.target.value);
              setNeedsNoDuplicateConfirm(false);
            }}
          />
          <Button
            variant="contained"
            onClick={handleMerge}
            disabled={submitting || !originalEmail || !duplicateEmail}
            startIcon={submitting ? <CircularProgress size={16} /> : undefined}
          >
            {submitting ? "Merging…" : "Merge accounts"}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {needsNoDuplicateConfirm && (
          <Alert
            severity="warning"
            sx={{ mt: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleConfirmNoDuplicate}
                disabled={submitting}
              >
                Yes, attach it anyway
              </Button>
            }
          >
            No account exists for that duplicate email — if you already
            deleted it yourself (e.g. via the Firebase console), confirm and
            this will attach the email to the original account.
          </Alert>
        )}
        {result && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {result}
          </Alert>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default MergeDuplicateAccountPanel;
