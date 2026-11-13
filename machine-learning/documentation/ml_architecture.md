# Machine-learning architecture

## System boundaries

Contextify uses three independent layers:

1. **Weighted prioritization:** Laravel's existing `PriorityCalculator` computes the 40/30/20/10 score from importance, urgency, time availability, and current workload.
2. **Research ML:** selected MS-LaTTE location model v1.0.4 supplies optional likely-location labels in the authenticated Decision Lab. It is a prediction about annotation patterns, not a task fact.
3. **AI explanation:** the existing explanation path may explain actual scores and known context. ML labels and AI prose do not change the score.
4. **Experimental synthetic priority classifier:** an optional class-weighted Random Forest predicts Low/Medium/High categories from task inputs. Seven source records labeled Critical are excluded because Critical is not a manuscript category. It is served by the local FastAPI service and shown separately from deterministic scores/ranking. It is explicitly not validated on real users.


## Runtime flow

The React Decision Lab sends selected task IDs to an authenticated Laravel endpoint. Laravel scopes records to the current user, sends task fields to the local FastAPI service, and displays returned categories in a separate experimental panel. The response includes model version and synthetic-data provenance. If the service or artifact is missing or invalid, the endpoint returns an unavailable response; normal task creation and weighted priority remain usable.

The MS-LaTTE location model runs in PHP at inference time. The experimental priority prototype requires a separate local Python API process. Neither model requires an external AI API key for prediction.

## Data and artifact flow

Original datasets are kept unchanged in `datasets/original/`. `datasets/import_datasets.py` creates normalized JSONL under `datasets/processed/`. Training scripts split records before fitting vocabulary/features, save JSON artifacts under `datasets/models/`, and write holdout results and provenance under `datasets/documentation/`. `model_registry.json` records artifact hash, data hash, version, target, training date, metrics, and deployment status.
