# VAASI-GUI
A basic GUI for performing Breathing Rate Variability (BRV) and Heart Rate Variability (HRV) analysis

VAASI is a browser-based graphical tool for computing **Heart Rate Variability (HRV)** and **Breath Rate Variability (BRV)** from physiological signals. It runs entirely client-side — no installation, server, or account required — and supports raw signal input (PPG for HRV/PRV and respiratory waveforms for BRV) as well as pre-extracted interval data.

This tool was developed to support the analysis presented in:

> Pramod Rajan S, Sangeetha B, and Manivannan M, **"A Non-Invasive Assessment of Breath Rate Variability in Late Pregnancy,"** *accepted for presentation at* the 2026 IEEE International Conference on Signal Processing, Information, Communication and Systems (SPICSCON), Bangladesh Army University of Engineering & Technology (BAUET), Natore, Bangladesh, 13–14 August 2026. *(In press — proceedings citation details will be updated once published.)*

If you use VAASI in your research, please cite the paper above (see [Citation](#citation) below).

> **Note on implementation:** the GUI was originally prototyped in Python and has since been rewritten as a standalone HTML/JavaScript application (this repository) for easier, install-free distribution and use. The current version described in this README reflects that HTML/JS implementation.

> **Note on BRV signal source:** the paper's BRV results were derived from a **PPG-based respiratory extraction pipeline** (respiration reconstructed from a photoplethysmography waveform, then validated against a reference respiratory belt). The current version of this GUI does **not** yet include that PPG-to-respiration extraction step — its BRV mode accepts **direct respiratory signals** (chest belt, nasal airflow, accelerometer z-axis, or similar) or pre-extracted breath-cycle intervals, and computes variability metrics from there. PPG-derived respiration extraction is a planned addition; see [Future scope](#future-scope) below.

## Features

- **Two analysis modes:** HRV (from PPG/ECG) and BRV (from **direct respiratory signals** — chest belt, nasal airflow, accelerometer, or other respiratory transducers; PPG-derived respiration extraction is not yet implemented, see note above).
- **Two input types:**
  - **Raw signal** — upload a waveform and VAASI detects peaks/breaths automatically, with adjustable height, distance, and prominence thresholds.
  - **Pre-computed intervals** — upload RR/IBI (ms) or breath-cycle durations (s/ms) directly.
- **File formats:** CSV and Excel (`.xlsx`, `.xls`).
- **Signal processing:** Butterworth low/high/band-pass filtering, Savitzky–Golay smoothing, cubic and monotone cubic spline interpolation, artifact correction.
- **Metrics computed:**
  - *Time domain:* mean/SD of intervals, RMSSD, pNN-type metrics, and related statistics.
  - *Frequency domain:* Welch and Lomb–Scargle spectral LF/HF ratios.
  - *Nonlinear domain:* Poincaré plot SD ratio, sample entropy, approximate entropy.
- **Interactive results:** zoomable/pannable charts (Chart.js), tabbed views (Time domain / Frequency / Poincaré / Nonlinear / Interval table), and CSV export of extracted intervals.
- **Runs fully offline in-browser** after the page loads — no data is uploaded to any server; all computation happens locally in JavaScript.

## Getting started

No build step or installation is required.

1. Download or clone this repository.
2. Open `VAASI_GUI.html` in a modern browser (Chrome, Firefox, or Edge recommended). An internet connection is needed on first load to fetch charting/parsing libraries from CDN (see [Dependencies](#dependencies)).
3. Choose **HRV** or **BRV** mode on the start screen.
4. Choose your input type:
   - **Signal** — upload a raw waveform file, then select the signal column, optional timestamp column, and sampling rate.
   - **Intervals** — upload a file with a column of RR/IBI values (HRV, in ms) or breath-cycle durations (BRV, in s or ms), with an optional time column.
5. Adjust peak-detection thresholds if needed, then run the analysis.
6. Explore results across the Time domain, Frequency, Poincaré/Nonlinear, and interval-table tabs. Export the extracted intervals to CSV using the export button.

No installation via `git clone` is strictly necessary either — you can simply download `VAASI_GUI.html` and `VAASI_algorithms.js` into the same folder and double-click the HTML file.

## Repository structure

```
VAASI/
├── VAASI_GUI.html         # Main application — open this file in a browser
├── VAASI_algorithms.js    # Signal processing & variability computation logic
├── assets/                # Screenshots / example data (optional)
├── LICENSE
├── CITATION.cff
└── README.md
```

## Dependencies

All dependencies are loaded automatically from CDN inside `VAASI_GUI.html` — nothing to install locally:

| Library | Purpose |
|---|---|
| [PapaParse](https://www.papaparse.com/) | CSV parsing |
| [SheetJS (xlsx)](https://sheetjs.com/) | Excel file parsing |
| [Chart.js](https://www.chartjs.org/) | Interactive charting |
| [chartjs-plugin-zoom](https://github.com/chartjs/chartjs-plugin-zoom) | Chart pan/zoom |
| [Hammer.js](https://hammerjs.github.io/) | Touch gesture support for chart zoom |

If you need a fully offline copy (e.g., for use without internet access), download these libraries locally and update the `<script src="...">` paths near the bottom of `VAASI_GUI.html`.

## Data privacy

VAASI performs all computation locally in your browser. Uploaded files are never transmitted to a server — this makes it suitable for use with sensitive or unpublished physiological data, subject to your own institution's data-handling policies.

## Citation

If this tool contributes to your research, please cite:

```
P. Rajan S, B. Sangeetha, and M. Manivannan, "A non-invasive assessment of breath rate variability in late pregnancy," in Proc. 2026 IEEE Int. Conf. Signal Process., Inf., Commun. Syst. (SPICSCON), Bangladesh Army Univ. of Eng. & Technol. (BAUET), Natore, Bangladesh, Aug. 13–14, 2026, in press.
```

*Note: this is a conference paper accepted for SPICSCON 2026 but not yet published/indexed. Final page numbers, DOI, and IEEE Xplore details will be added once available — check back or update this citation after publication.*

See [`CITATION.cff`](CITATION.cff) for a machine-readable citation (also usable via GitHub's "Cite this repository" button).

## Future scope

- Add a PPG-to-respiration extraction pipeline (as used for the BRV results in the associated paper), so BRV analysis can be run directly from a PPG waveform instead of requiring a dedicated respiratory sensor input.
- Additional validation against reference respiratory belt data across broader physiological scenarios.

## Contributing

Issues and pull requests are welcome — please open an issue first to discuss significant changes.

## License

Released under the MIT License — see [`LICENSE`](LICENSE) for details.

## Contact

For questions about the tool or the associated research, contact the corresponding author: Pramod Rajan S (pramodedu37@gmail.com), Applied Mechanics and Biomedical Engineering Department, Indian Institute of Technology Madras.
