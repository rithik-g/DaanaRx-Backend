import request from 'supertest';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from '../graphql/schema';
import { resolvers } from '../graphql/resolvers';
import cors from 'cors';

describe('GraphQL API Functional Tests', () => {
  let app: express.Application;
  let server: ApolloServer;
  let authToken: string;
  let clinicId: string;
  let userId: string;

  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(cors());
    app.use(express.json());

    // Create Apollo Server
    server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    await server.start();

    // Apply middleware
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async ({ req }) => {
          const authHeader = req.headers.authorization || '';
          const token = authHeader.replace('Bearer ', '');
          const clinicId = req.headers['x-clinic-id'] as string;

          return {
            token,
            clinicId,
          };
        },
      })
    );
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Health Check', () => {
    it('should return API info on root endpoint', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });
  });

  describe('Authentication', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testClinicName = `Test Clinic ${Date.now()}`;

    it('should sign up a new user and clinic', async () => {
      const query = `
        mutation SignUp($email: String!, $password: String!, $clinicName: String!, $firstName: String!, $lastName: String!) {
          signUp(email: $email, password: $password, clinicName: $clinicName, firstName: $firstName, lastName: $lastName) {
            token
            user {
              userId
              email
              firstName
              lastName
            }
            clinic {
              clinicId
              name
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({
          query,
          variables: {
            email: testEmail,
            password: testPassword,
            clinicName: testClinicName,
            firstName: 'Test',
            lastName: 'User',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.signUp).toBeDefined();
      expect(response.body.data.signUp.token).toBeDefined();
      expect(response.body.data.signUp.user.email).toBe(testEmail);

      // Store for later tests
      authToken = response.body.data.signUp.token;
      userId = response.body.data.signUp.user.userId;
      clinicId = response.body.data.signUp.clinic.clinicId;
    });

    it('should check if email exists', async () => {
      const query = `
        query CheckEmailExists($email: String!) {
          checkEmailExists(email: $email)
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({
          query,
          variables: {
            email: testEmail,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.checkEmailExists).toBe(true);
    });

    it('should sign in with valid credentials', async () => {
      const query = `
        mutation SignIn($email: String!, $password: String!) {
          signIn(email: $email, password: $password) {
            token
            user {
              userId
              email
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({
          query,
          variables: {
            email: testEmail,
            password: testPassword,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.signIn).toBeDefined();
      expect(response.body.data.signIn.token).toBeDefined();
    });

    it('should get current user info', async () => {
      const query = `
        query Me {
          me {
            userId
            email
            firstName
            lastName
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.me).toBeDefined();
      expect(response.body.data.me.email).toBe(testEmail);
    });
  });

  describe('Location Management', () => {
    let locationId: string;

    it('should create a new location', async () => {
      const query = `
        mutation CreateLocation($input: LocationInput!) {
          createLocation(input: $input) {
            locationId
            locationName
            temperatureType
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query,
          variables: {
            input: {
              locationName: 'Test Fridge',
              temperatureType: 'fridge',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.createLocation).toBeDefined();
      expect(response.body.data.createLocation.locationName).toBe('Test Fridge');

      locationId = response.body.data.createLocation.locationId;
    });

    it('should get all locations', async () => {
      const query = `
        query GetLocations {
          getLocations {
            locationId
            locationName
            temperatureType
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.getLocations).toBeDefined();
      expect(Array.isArray(response.body.data.getLocations)).toBe(true);
      expect(response.body.data.getLocations.length).toBeGreaterThan(0);
    });

    it('should get a specific location', async () => {
      const query = `
        query GetLocation($locationId: ID!) {
          getLocation(locationId: $locationId) {
            locationId
            locationName
            temperatureType
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query,
          variables: {
            locationId,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.getLocation).toBeDefined();
      expect(response.body.data.getLocation.locationId).toBe(locationId);
    });
  });

  describe('Lot Management', () => {
    let lotId: string;
    let locationId: string;

    beforeAll(async () => {
      // Create a location first
      const locationQuery = `
        mutation CreateLocation($input: LocationInput!) {
          createLocation(input: $input) {
            locationId
          }
        }
      `;

      const locationResponse = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query: locationQuery,
          variables: {
            input: {
              locationName: 'Test Location for Lot',
              temperatureType: 'room_temp',
            },
          },
        });

      locationId = locationResponse.body.data.createLocation.locationId;
    });

    it('should create a new lot', async () => {
      const query = `
        mutation CreateLot($input: LotInput!) {
          createLot(input: $input) {
            lotId
            source
            note
            maxCapacity
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query,
          variables: {
            input: {
              source: 'Test Donation Source',
              note: 'Test lot for automated testing',
              locationId: locationId,
              maxCapacity: 1000,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.createLot).toBeDefined();
      expect(response.body.data.createLot.source).toBe('Test Donation Source');

      lotId = response.body.data.createLot.lotId;
    });

    it('should get all lots', async () => {
      const query = `
        query GetLots {
          getLots {
            lotId
            source
            note
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.getLots).toBeDefined();
      expect(Array.isArray(response.body.data.getLots)).toBe(true);
    });
  });

  describe('Unit Management (Inventory)', () => {
    let unitId: string;
    let lotId: string;
    let drugId: string;

    beforeAll(async () => {
      // Create location, lot, and drug for unit tests
      const locationQuery = `
        mutation CreateLocation($input: LocationInput!) {
          createLocation(input: $input) {
            locationId
          }
        }
      `;

      const locationResponse = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query: locationQuery,
          variables: {
            input: {
              locationName: 'Test Location for Units',
              temperatureType: 'room_temp',
            },
          },
        });

      const locationId = locationResponse.body.data.createLocation.locationId;

      const lotQuery = `
        mutation CreateLot($input: LotInput!) {
          createLot(input: $input) {
            lotId
          }
        }
      `;

      const lotResponse = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query: lotQuery,
          variables: {
            input: {
              source: 'Test Source for Units',
              locationId: locationId,
            },
          },
        });

      lotId = lotResponse.body.data.createLot.lotId;
    });

    it('should create a new unit with manual drug data', async () => {
      const query = `
        mutation CreateUnit($input: CreateUnitRequest!) {
          createUnit(input: $input) {
            unitId
            totalQuantity
            availableQuantity
            expiryDate
          }
        }
      `;

      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query,
          variables: {
            input: {
              totalQuantity: 100,
              availableQuantity: 100,
              lotId: lotId,
              expiryDate: expiryDate.toISOString().split('T')[0],
              manufacturerLotNumber: 'TEST123',
              drugData: {
                medicationName: 'Test Medication',
                genericName: 'Test Generic',
                strength: '10',
                strengthUnit: 'mg',
                form: 'tablet',
                ndcId: '12345-6789-00',
              },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.createUnit).toBeDefined();
      expect(response.body.data.createUnit.totalQuantity).toBe(100);
      expect(response.body.data.createUnit.availableQuantity).toBe(100);

      unitId = response.body.data.createUnit.unitId;
    });

    it('should get all units', async () => {
      const query = `
        query GetUnits($page: Int, $pageSize: Int) {
          getUnits(page: $page, pageSize: $pageSize) {
            units {
              unitId
              totalQuantity
              availableQuantity
            }
            totalCount
            page
            pageSize
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query,
          variables: {
            page: 1,
            pageSize: 20,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.getUnits).toBeDefined();
      expect(response.body.data.getUnits.units).toBeDefined();
      expect(Array.isArray(response.body.data.getUnits.units)).toBe(true);
    });

    it('should get units with advanced filtering', async () => {
      const query = `
        query GetUnitsAdvanced($filters: UnitFilters, $page: Int, $pageSize: Int) {
          getUnitsAdvanced(filters: $filters, page: $page, pageSize: $pageSize) {
            units {
              unitId
              totalQuantity
              availableQuantity
            }
            totalCount
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query,
          variables: {
            filters: {},
            page: 1,
            pageSize: 20,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.getUnitsAdvanced).toBeDefined();
    });

    it('should get a specific unit', async () => {
      const query = `
        query GetUnit($unitId: ID!) {
          getUnit(unitId: $unitId) {
            unitId
            totalQuantity
            availableQuantity
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query,
          variables: {
            unitId,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.getUnit).toBeDefined();
      expect(response.body.data.getUnit.unitId).toBe(unitId);
    });
  });

  describe('Dashboard Stats', () => {
    it('should get dashboard statistics', async () => {
      const query = `
        query GetDashboardStats {
          getDashboardStats {
            totalUnits
            unitsExpiringSoon
            recentCheckIns
            recentCheckOuts
            lowStockAlerts
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.getDashboardStats).toBeDefined();
      expect(typeof response.body.data.getDashboardStats.totalUnits).toBe('number');
    });
  });

  describe('Transaction Management', () => {
    it('should get all transactions', async () => {
      const query = `
        query GetTransactions($page: Int, $pageSize: Int) {
          getTransactions(page: $page, pageSize: $pageSize) {
            transactions {
              transactionId
              type
              quantity
            }
            totalCount
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query,
          variables: {
            page: 1,
            pageSize: 20,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.getTransactions).toBeDefined();
      expect(response.body.data.getTransactions.transactions).toBeDefined();
    });
  });

  describe('Drug Search', () => {
    it('should search drugs by query', async () => {
      const query = `
        query SearchDrugs($query: String!) {
          searchDrugs(query: $query) {
            drugId
            medicationName
            genericName
            ndcId
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-clinic-id', clinicId)
        .send({
          query,
          variables: {
            query: 'aspirin',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.searchDrugs).toBeDefined();
      expect(Array.isArray(response.body.data.searchDrugs)).toBe(true);
    });
  });
});
