import { GroupModel } from '@wb/shared-types';

export const Group = ({ group }: { group: GroupModel }) => {
  return <div>{group.label}</div>;
}

export const GroupPreview = ({ group }: { group: GroupModel }) => {
  return <div>{group.label}</div>;
}
