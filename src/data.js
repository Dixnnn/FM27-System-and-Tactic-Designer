// The editable data files, bundled into the app. The app can swap in a user's own roles.json / tuning.json.
import roles from '../data/roles.json' with { type: 'json' };
import formations from '../data/formations.json' with { type: 'json' };
import columns from '../data/columns.json' with { type: 'json' };
import tuning from '../data/tuning.json' with { type: 'json' };
import instructions from '../data/instructions.json' with { type: 'json' };

export const DEFAULT_DOCS = { roles, formations, columns, tuning, instructions };
