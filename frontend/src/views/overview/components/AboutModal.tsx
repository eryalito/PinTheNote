import { MouseEvent, useEffect, useRef, useState } from "react";
import { Browser } from "@wailsio/runtime";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { GetVersionInfo } from "../../../../bindings/github.com/eryalito/pinthenote/internal/services/versionservice";
import { DetailedVersionInfo } from "../../../../bindings/github.com/eryalito/pinthenote/internal/services/models";
import "./AboutModal.css";

type AboutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [versionInfo, setVersionInfo] = useState<DetailedVersionInfo | null>(null);
  const [loadingVersionInfo, setLoadingVersionInfo] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    const loadVersionInfo = async () => {
      try {
        setLoadingVersionInfo(true);
        setVersionError(null);
        const result = await GetVersionInfo();

        if (!cancelled) {
          setVersionInfo(result ?? null);
        }
      } catch {
        if (!cancelled) {
          setVersionError("Failed to load version details.");
        }
      } finally {
        if (!cancelled) {
          setLoadingVersionInfo(false);
        }
      }
    };

    void loadVersionInfo();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const version = versionInfo?.version?.trim() || "unknown";
  const commitRaw = versionInfo?.commit?.trim() || "unknown";
  const commit = commitRaw === "unknown" ? commitRaw : commitRaw.slice(0, 7);
  const buildDate = versionInfo?.buildDate?.trim() || "unknown";

  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  };

  const onOpenGithub = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    void Browser.OpenURL("https://github.com/eryalito/pinthenote");
  };

  return (
    <dialog
      ref={dialogRef}
      className="about-modal"
      aria-labelledby="about-modal-title"
      onClose={onClose}
      onClick={onBackdropClick}
    >
      <article className="about-modal-card">
        <header className="about-modal-header">
          <h3 id="about-modal-title" className="about-modal-title">About PinTheNote</h3>
        </header>

        {loadingVersionInfo ? (
          <p className="about-modal-status">Loading version details...</p>
        ) : versionError ? (
          <p className="about-modal-status">{versionError}</p>
        ) : (
          <dl className="about-modal-metadata">
            <div className="about-modal-row">
              <dt>Version</dt>
              <dd>{version}</dd>
            </div>
            <div className="about-modal-row">
              <dt>Commit</dt>
              <dd>{commit}</dd>
            </div>
            <div className="about-modal-row">
              <dt>Build date</dt>
              <dd>{buildDate}</dd>
            </div>
          </dl>
        )}

        <p className="about-modal-link-wrap">
          <a
            className="about-modal-link"
            href="https://github.com/eryalito/pinthenote"
            rel="noreferrer noopener"
            onClick={onOpenGithub}
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> GitHub repository
          </a>
        </p>

        <form method="dialog" className="about-modal-actions">
          <menu className="buttons">
            <button className="overview-button" value="close">Close</button>
          </menu>
        </form>
      </article>
    </dialog>
  );
}