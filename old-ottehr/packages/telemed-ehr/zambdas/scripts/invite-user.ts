import fetch from 'node-fetch';
import { Practitioner } from 'fhir/r4';
import { ADMINISTRATOR_RULES, INACTIVE_RULES, MANAGER_RULES, STAFF_RULES, PROVIDER_RULES, PRESCRIBER_RULES } from '../src/shared';

const DEFAULTS = {
  firstName: 'Example',
  lastName: 'Doctor',
  phone: '+12125551212',
  npi: '1234567890'
};
export const enum RoleType {
  NewUser = 'NewUser',
  Inactive = 'Inactive',
  Manager = 'Manager',
  FrontDesk = 'FrontDesk',
  Staff = 'Staff',
  Provider = 'Provider',
  Prescriber = 'Prescriber',
  Administrator = 'Administrator',
}

const updateUserRoles = async (projectApiUrl: string, accessToken: string, projectId: string): Promise<{ id: string }> => {
  console.log('Updating user roles.');

  const zambdaRule = {
    resource: ['Zambda:Function:*'],
    action: ['Zambda:InvokeFunction'],
    effect: 'Allow',
  };
  const inactiveAccessPolicy = { rule: [...INACTIVE_RULES, zambdaRule] };
  const administratorAccessPolicy = { rule: [...ADMINISTRATOR_RULES, zambdaRule] };
  const managerAccessPolicy = { rule: [...MANAGER_RULES, zambdaRule] };
  const staffAccessPolicy = { rule: [...STAFF_RULES, zambdaRule] };
  const providerAccessPolicy = { rule: [...PROVIDER_RULES, zambdaRule] };
  const prescriberAccessPolicy = { rule: [...PRESCRIBER_RULES, zambdaRule] };

  const roles = [
    { name: RoleType.Inactive, accessPolicy: inactiveAccessPolicy },
    { name: RoleType.Administrator, accessPolicy: administratorAccessPolicy },
    { name: RoleType.Manager, accessPolicy: managerAccessPolicy },
    { name: RoleType.Staff, accessPolicy: staffAccessPolicy },
    { name: RoleType.Provider, accessPolicy: providerAccessPolicy },
    { name: RoleType.Prescriber, accessPolicy: prescriberAccessPolicy },
  ];

  const httpHeaders = {
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
    'x-zapehr-project-id': `${projectId}`,
  };

  console.log('searching for existing roles for the project');
  const existingRolesResponse = await fetch(`${projectApiUrl}/iam/role`, {
    method: 'GET',
    headers: httpHeaders,
  });
  const existingRoles = await existingRolesResponse.json();
  console.log('existingRoles: ', existingRoles);
  if (!existingRolesResponse.ok) {
    throw new Error('Error searching for existing roles');
  }

  let adminUserRole = undefined;

  for (const role of roles) {
    const roleName = role.name;
    let foundRole;
    let roleResJson = undefined;
    if (existingRoles.length > 0) {
      foundRole = existingRoles.find((existingRole: any) => existingRole.name === roleName);
    }
    if (foundRole) {
      console.log(`${roleName} role found: `, foundRole);
      const roleRes = await fetch(`${projectApiUrl}/iam/role/${foundRole.id}`, {
        method: 'PATCH',
        headers: httpHeaders,
        body: JSON.stringify({ accessPolicy: role.accessPolicy }),
      });
      roleResJson = await roleRes.json();
      if (!roleRes.ok) {
        console.log(roleResJson);
        throw new Error(`Failed to patch role ${roleName}`);
      }
      console.log(`${roleName} role accessPolicy patched: `, roleResJson, JSON.stringify(roleResJson.accessPolicy));
    } else {
      console.log(`creating ${roleName} role`);
      const roleRes = await fetch(`${projectApiUrl}/iam/role`, {
        method: 'POST',
        headers: httpHeaders,
        body: JSON.stringify({ name: roleName, accessPolicy: role.accessPolicy }),
      });
      roleResJson = await roleRes.json();
      if (!roleRes.ok) {
        console.log(roleResJson);
        throw new Error(`Failed to create role ${roleName}`);
      }
      console.log(`${roleName} role: `, roleResJson, JSON.stringify(roleResJson.accessPolicy));
    }

    if (roleResJson.name === RoleType.Administrator) {
      adminUserRole = roleResJson;
    }
  }

  console.group(`Setting defaultSSOUserRole for project to Administrator user role ${adminUserRole.id}`);
  // const endpoint = `${projectApiUrl}/project`;
  // const response = await fetch(endpoint, {
  //   method: 'PATCH',
  //   headers: httpHeaders,
  //   body: JSON.stringify({ defaultSSOUserRoleId: adminUserRole.id }),
  // });
  // const responseJSON = await response.json();
  // console.log('response', responseJSON);
  // if (!response.ok) {
    // throw new Error(`Failed to set defaultSSOUserRole`);
  // }

  return adminUserRole;
};


export async function inviteUser(
  projectApiUrl: string,
  email: string,
  firstName = DEFAULTS.firstName,
  lastName = DEFAULTS.lastName,
  applicationId: string,
  accessToken: string,
  projectId: string
): Promise<undefined | string> {
  const defaultRole = await updateUserRoles(projectApiUrl, accessToken, projectId);

  const practitioner: Practitioner = {
    resourceType: 'Practitioner',
    active: true,
    identifier: [
      {
        use: 'official',
        value: DEFAULTS.npi,
        system: 'http://hl7.org/fhir/sid/us-npi'
      }
    ],    
    name: [{ family: lastName, given: [firstName] }],
    telecom: [
      {
        system: 'email',
        value: email,
      },
      {
        use: 'mobile',
        value: DEFAULTS.phone,
        system: "sms"
      }

    ],
  };

  const activeUsersRequest = await fetch(`${projectApiUrl}/user`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-zapehr-project-id': `${projectId}`,
    }
  });
  const activeUsers = await activeUsersRequest.json()
  if (activeUsers.find((user: any) => user.email === email)) {
    console.log('User is already invited to project');
    return undefined;
  }
  else {
    console.log('Inviting user to project');
    const invitedUserResponse = await fetch(`${projectApiUrl}/user/invite`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'x-zapehr-project-id': `${projectId}`,
      },
      body: JSON.stringify({
        email: email,
        applicationId: applicationId,
        resource: practitioner,
        roles: [
          defaultRole.id
        ]
      }),
    });


    if (!invitedUserResponse.ok) {
      console.log(await invitedUserResponse.json());
      throw new Error('Failed to create user');
    }

    const invitedUser = await invitedUserResponse.json();
    return invitedUser.invitationUrl;
  }
}
