import * as hapiMock from '../..';
import cases from './cases';

export default [...cases, {
  title: 'catchall',
  condition: () => true,
  code: 419,
}] as hapiMock.MockCase[];
