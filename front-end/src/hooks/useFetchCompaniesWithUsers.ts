import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { db } from '../utils/firebase';
import { CompanyType, UserType } from '../utils/types';
import { fetchCompanyUsersFromFirestore } from '../thunks/usersThunks';
import { collection, getDocs } from 'firebase/firestore';
import { useAppDispatch } from '../utils/store';

interface CompanyWithUsersAndId extends CompanyType {
  id: string;
  users: UserType[];
  superAdminDetails: UserType[];
  adminDetails: UserType[];
  employeeDetails: UserType[];
  pendingDetails: UserType[];
}

const useFetchCompaniesWithUsers = (userRole: string | undefined) => {
  const dispatch = useAppDispatch();
  const [companies, setCompanies] = useState<CompanyWithUsersAndId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCompaniesAndUsers = async () => {
      if (userRole === 'developer') {
        setLoading(true);
        setError(null);
        try {
          // Example assuming you have a setup to handle Firestore collections
          const querySnapshot = await getDocs(collection(db, "companies"));
          const companiesData = await Promise.all(
            querySnapshot.docs.map(async (docSnapshot) => {
              const company = { id: docSnapshot.id, ...(docSnapshot.data() as CompanyType) };
              
              // Dispatch the thunk and wait for the result
              const allUsers = await dispatch(fetchCompanyUsersFromFirestore(company.id)).unwrap();
              // console.log(allUsers);

              // Filter users based on their roles after you have fetched them
              const superAdminDetails = allUsers.filter(user => user.role === 'super-admin');
              const adminDetails = allUsers.filter(user => user.role === 'admin');
              const employeeDetails = allUsers.filter(user => user.role === 'employee');
              const pendingDetails = allUsers.filter(user => user.role === 'status-pending');

              return { 
                ...company, 
                users: allUsers,
                superAdminDetails,
                adminDetails, 
                employeeDetails, 
                pendingDetails 
              };
            })
          );
          setCompanies(companiesData);
        } catch (error) {
          setError(error as Error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCompaniesAndUsers();
  }, [userRole, dispatch]); // Include dispatch in the dependencies array

  return { companies, loading, error };
};

export default useFetchCompaniesWithUsers;

