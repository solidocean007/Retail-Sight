// AccountManager.tsx - a simple implementation allowing admins to view, upload, and update accounts
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  CircularProgress,
  TextField,
} from "@mui/material";
import * as XLSX from "xlsx";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "@firebase/firestore";
import { CompanyAccountType } from "../utils/types";
import { db } from "../utils/firebase";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import getCompanyAccountId from "../utils/helperFunctions/getCompanyAccountId";
import { getDocs } from "@firebase/firestore";
import './accountsManager.css'

interface AccountManagerProps {
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AccountManager: React.FC<AccountManagerProps> = ({
  isAdmin,
  isSuperAdmin,
}) => {
  const user = useSelector(selectUser);
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [fileData, setFileData] = useState<CompanyAccountType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] =
    useState<CompanyAccountType | null>(null);
  const itemsPerPage = 25;

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    if (!user?.companyId) {
      console.error("No companyId found for user");
      return;
    }
  
    try {
      const accountsId = await getCompanyAccountId(user.companyId);
      if (!accountsId) {
        console.error("No accountsId found for company");
        return;
      }
  
      const accountsDocRef = doc(db, "accounts", accountsId);
      const accountsSnapshot = await getDoc(accountsDocRef);
  
      if (accountsSnapshot.exists()) {
        const accountsData = accountsSnapshot.data();
        const formattedAccounts = (accountsData.accounts as CompanyAccountType[]).map((account) => ({
          ...account,
          salesRouteNums: Array.isArray(account.salesRouteNums)
            ? account.salesRouteNums.map((num) => String(num)) // Convert to strings
            : [],
        }));
  
        setAccounts(formattedAccounts);
      } else {
        console.error("No accounts found in Firestore");
      }
    } catch (error) {
      console.error("Error fetching accounts from Firestore:", error);
    }
  };
  

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    if (!user?.companyId) {
      console.error("No companyId found for user");
      return;
    }
  
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json<CompanyAccountType>(worksheet);
  
      const formattedFileData = json.map((account) => ({
        ...account,
        salesRouteNums: Array.isArray(account.salesRouteNums)
          ? account.salesRouteNums.map((num) => String(num)) // Ensure strings
          : [],
      }));
  
      setFileData(formattedFileData);
    };
  
    reader.readAsArrayBuffer(file);
  };
  

  console.log(user);

  const handleSubmitAccounts = async () => {
    if (!user?.companyId) {
      console.error("No companyId found for user");
      return;
    }
  
    if (!fileData.length) {
      console.error("No file data available to submit");
      return;
    }
  
    try {
      const accountsCollectionRef = collection(db, "accounts");
  
      // Group accounts by `accountNumber` and aggregate `salesRouteNums` as an array
      const accountMap: { [key: string]: CompanyAccountType } = {};
  
      fileData.forEach((account) => {
        const { accountNumber, accountName, accountAddress, salesRouteNums } =
          account;
  
        // Ensure salesRouteNums is an array
        const routeNumsArray = Array.isArray(salesRouteNums)
          ? salesRouteNums
          : [salesRouteNums].filter(Boolean);
  
        if (accountMap[accountNumber]) {
          // Append unique sales routes for existing account
          accountMap[accountNumber].salesRouteNums = Array.from(
            new Set([...accountMap[accountNumber].salesRouteNums, ...routeNumsArray])
          );
        } else {
          // Initialize a new account in the map
          accountMap[accountNumber] = {
            accountNumber,
            accountName,
            accountAddress,
            salesRouteNums: routeNumsArray,
          };
        }
      });
  
      // Convert the map to an array of accounts
      const formattedAccounts = Object.values(accountMap);
  
      // Submit to Firestore and let Firestore generate a unique document ID
      const accountsDocRef = await addDoc(accountsCollectionRef, {
        accounts: formattedAccounts,
      });
  
      // Update the company document with reference to this accounts document
      const companyDocRef = doc(db, "companies", user.companyId);
      await updateDoc(companyDocRef, {
        accountsId: accountsDocRef.id,
      });
  
      console.log("Accounts successfully submitted to Firestore");
  
    } catch (error) {
      console.error("Error submitting accounts to Firestore:", error);
    }
  };
  

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleEditAccount = (account: CompanyAccountType) => {
    setSelectedAccount(account);
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount || !user?.companyId) return;

    try {
      const companyDocRef = doc(db, "companies", user.companyId);
      const companySnapshot = await getDoc(companyDocRef);

      if (companySnapshot.exists()) {
        const { accountsId } = companySnapshot.data();

        if (accountsId) {
          const accountsDocRef = doc(db, "accounts", accountsId);
          const accountsSnapshot = await getDoc(accountsDocRef);

          if (accountsSnapshot.exists()) {
            const accountsData = accountsSnapshot.data();
            const updatedAccounts = (
              accountsData.accounts as CompanyAccountType[]
            ).map((acc) =>
              acc.accountNumber === selectedAccount.accountNumber
                ? selectedAccount
                : acc
            );

            await updateDoc(accountsDocRef, {
              accounts: updatedAccounts,
            });

            setAccounts(updatedAccounts);
            setSelectedAccount(null);
          }
        }
      }
    } catch (error) {
      console.error("Error updating account in Firestore:", error);
    }
  };

  const paginatedAccounts = accounts.slice( // what is this for?
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const filteredAccounts = accounts.filter(
    (account) =>
      account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountNumber.toString().includes(searchTerm)
  );

  return (
    <Box className="account-manager-container account-manager">
      <Typography variant="h2" gutterBottom>
        Accounts Manager
      </Typography>
      {(isAdmin || isSuperAdmin) && (
        <>
          <Button
            className="account-submit-button"
            variant="contained"
            component="label"
            sx={{ marginBottom: 2 }}
          >
            {accounts.length > 0 ? "Update Accounts" : "Upload Accounts"}
            <input
              type="file"
              accept=".csv, .xlsx"
              hidden
              onChange={handleFileUpload}
            />
          </Button>

          {fileData.length > 0 && (
            <Box sx={{ marginTop: 2 }}>
              <Typography variant="body1">
                Review your data and click submit to finalize:
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleSubmitAccounts()} // Wrap in anonymous function
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} />
                ) : (
                  "Submit Accounts"
                )}
              </Button>
            </Box>
          )}
        </>
      )}

      <TextField
        className="account-search-field"
        label="Search Account"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={handleSearch}
        sx={{ marginY: 2 }}
      />

      {selectedAccount && (
        <Box sx={{ marginBottom: 3 }}>
          <Typography variant="h6">Edit Account</Typography>
          <TextField
            label="Account Number"
            fullWidth
            value={selectedAccount.accountNumber}
            onChange={(e) =>
              setSelectedAccount({
                ...selectedAccount,
                accountNumber: e.target.value,
              })
            }
            sx={{ marginY: 1 }}
          />
          <TextField
            label="Account Name"
            fullWidth
            value={selectedAccount.accountName}
            onChange={(e) =>
              setSelectedAccount({
                ...selectedAccount,
                accountName: e.target.value,
              })
            }
            sx={{ marginY: 1 }}
          />
          <TextField
            label="Account Address"
            fullWidth
            value={selectedAccount.accountAddress}
            onChange={(e) =>
              setSelectedAccount({
                ...selectedAccount,
                accountAddress: e.target.value,
              })
            }
            sx={{ marginY: 1 }}
          />
          <TextField
            label="Sales Route Numbers (comma separated)"
            fullWidth
            value={
              Array.isArray(selectedAccount.salesRouteNums)
                ? selectedAccount.salesRouteNums.join(", ")
                : ""
            }
            onChange={(e) =>
              setSelectedAccount({
                ...selectedAccount,
                salesRouteNums: e.target.value
                  .split(",")
                  .map((num) => num.trim()),
              })
            }
            sx={{ marginY: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateAccount}
            sx={{ marginLeft: 2 }}
          >
            Update Account
          </Button>
          <Button
            variant="text"
            color="secondary"
            onClick={() => setSelectedAccount(null)}
            sx={{ marginLeft: 2 }}
          >
            Cancel
          </Button>
        </Box>
      )}
       <Pagination
        count={Math.ceil(filteredAccounts.length / itemsPerPage)}
        page={currentPage}
        onChange={(e, page) => setCurrentPage(page)}
        sx={{ marginTop: 2 }}
      />

      <TableContainer component={Paper} sx={{ marginTop: 3 }}>
        <Table className="account-table" aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Account Number</TableCell>
              <TableCell>Account Name</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Sales Route Number</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAccounts
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((account, index) => (
                <TableRow key={index}>
                  <TableCell>{account.accountNumber}</TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>{account.accountAddress}</TableCell>
                  <TableCell>
                    {Array.isArray(account.salesRouteNums)
                      ? account.salesRouteNums.join(" and ")
                      : account.salesRouteNums}
                  </TableCell>
                  <TableCell>
                    <Button
                      className="account-edit-button"
                      variant="text"
                      color="primary"
                      onClick={() => handleEditAccount(account)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
     
    </Box>
  );
};

export default AccountManager;
